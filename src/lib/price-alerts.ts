// Price alerts v1 — client-side, persistent (safeStorage → localStorage).
// TV.2 roadmap feature 1 (TV2_PARITY_AUDIT.md §5 P1): real cross alerts with
// once/every-time semantics, optional expiry, toast + beep + browser
// Notification. Server-side persistence stays a later roadmap item.
//
// The evaluator is a pure function so it is unit-testable without React or a
// store: `evaluateAlerts` takes the previous/next mid prices per symbol and
// returns which alerts fired plus what remains active.

import { uid } from "./uid.ts";

/** How the alert arms against the market. */
export type AlertCondition = "cross" | "above" | "below";

/** Expiry presets — epoch ms when the alert self-deactivates. */
export type AlertExpiry = "none" | "1h" | "4h" | "1d" | "1w";

export interface PriceAlert {
  id: string;
  symbol: string;
  /** Target level the market must reach. */
  price: number;
  condition: AlertCondition;
  /** true = fire once and deactivate; false = refire on every cross (30s cooldown). */
  once: boolean;
  /** Epoch ms after which the alert stops evaluating (0 = never). */
  expiresAt: number;
  createdAt: number;
  /** Epoch ms of the most recent fire (cooldown bookkeeping). */
  lastFiredAt?: number;
  /** Epoch ms when the alert was deactivated (once-fired or expired). Kept for the list UI. */
  triggeredAt?: number;
}

export interface MidTicks {
  /** symbol → mid price. Only symbols present are evaluated. */
  [symbol: string]: number;
}

const REFIRE_COOLDOWN_MS = 30_000;

export const EXPIRY_MS: Record<Exclude<AlertExpiry, "none">, number> = {
  "1h": 3_600_000,
  "4h": 14_400_000,
  "1d": 86_400_000,
  "1w": 604_800_000,
};

export function expiryToTimestamp(expiry: AlertExpiry, now = Date.now()): number {
  return expiry === "none" ? 0 : now + EXPIRY_MS[expiry];
}

export function createAlert(
  input: Pick<PriceAlert, "symbol" | "price" | "condition" | "once"> & {
    expiry?: AlertExpiry;
    now?: number;
  },
): PriceAlert {
  const now = input.now ?? Date.now();
  return {
    id: uid(),
    symbol: input.symbol,
    price: input.price,
    condition: input.condition,
    once: input.once,
    expiresAt: expiryToTimestamp(input.expiry ?? "none", now),
    createdAt: now,
  };
}

/** Is this alert still evaluating? Expired alerts flip to triggeredAt (once). */
export function isExpired(alert: PriceAlert, now = Date.now()): boolean {
  return alert.expiresAt > 0 && now >= alert.expiresAt && alert.triggeredAt == null;
}

/** Would the alert's condition hold between the previous and current mid? */
export function conditionMet(
  alert: PriceAlert,
  prevMid: number,
  mid: number,
): boolean {
  switch (alert.condition) {
    case "cross":
      // Any straddle of the level between the two prices.
      return prevMid < alert.price !== mid < alert.price;
    case "above":
      // First tick at/above the level after being below it.
      return prevMid < alert.price && mid >= alert.price;
    case "below":
      return prevMid > alert.price && mid <= alert.price;
  }
}

/**
 * Pure evaluator. Returns the alerts that fired this step (already updated with
 * lastFiredAt/triggeredAt) and the full next state (cooled-down refires and
 * once-fired/expired deactivations applied). Mutates nothing.
 */
export function evaluateAlerts(
  alerts: readonly PriceAlert[],
  prev: MidTicks,
  next: MidTicks,
  now = Date.now(),
): { fired: PriceAlert[]; nextAlerts: PriceAlert[] } {
  const fired: PriceAlert[] = [];
  const nextAlerts = alerts.map((alert) => {
    // Expire lazily: flip it once, then leave it alone.
    if (isExpired(alert, now)) {
      return { ...alert, triggeredAt: now };
    }
    if (alert.triggeredAt != null) return alert;

    const prevMid = prev[alert.symbol];
    const mid = next[alert.symbol];
    if (prevMid == null || mid == null) return alert;
    if (!conditionMet(alert, prevMid, mid)) return alert;
    if (alert.lastFiredAt != null && now - alert.lastFiredAt < REFIRE_COOLDOWN_MS) {
      return alert;
    }

    const updated: PriceAlert = { ...alert, lastFiredAt: now };
    if (alert.once) updated.triggeredAt = now;
    fired.push(updated);
    return updated;
  });

  return { fired, nextAlerts };
}

/** Human line for the toast / notification body. */
export function alertMessage(alert: PriceAlert, mid: number): string {
  const dir =
    alert.condition === "cross" ? "crossed" : alert.condition === "above" ? "is above" : "is below";
  return `${alert.symbol} ${dir} ${alert.price} (now ${mid})`;
}

// ── Persistence (safeStorage → localStorage) ────────────────
const STORAGE_KEY = "tv2_price_alerts";

export function loadAlerts(read: (key: string) => string | null): PriceAlert[] {
  try {
    const raw = read(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is PriceAlert =>
        typeof a === "object" &&
        a != null &&
        typeof (a as PriceAlert).id === "string" &&
        typeof (a as PriceAlert).symbol === "string" &&
        typeof (a as PriceAlert).price === "number",
    );
  } catch {
    return [];
  }
}

export function saveAlerts(
  alerts: readonly PriceAlert[],
  write: (key: string, value: string) => boolean,
): void {
  // Keep the payload bounded: active alerts first, then triggered (most
  // recent first) — cap 100.
  const trimmed = [...alerts]
    .sort((a, b) => {
      if (a.triggeredAt == null && b.triggeredAt == null) return 0;
      if (a.triggeredAt == null) return -1;
      if (b.triggeredAt == null) return 1;
      return b.triggeredAt - a.triggeredAt;
    })
    .slice(0, 100);
  try {
    write(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // safeStorage already degrades to no-op; nothing else to do.
  }
}
