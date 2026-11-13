// Price-alerts engine + store (roadmap feature 1, TV2_PARITY_AUDIT.md §5).
//
// The store is plain zustand; the engine is a single subscription on the
// trading store's tick map — the same pattern the chart's render pump uses, so
// alerts evaluate per tick WITHOUT re-rendering React. Persistence goes through
// safeStorage (localStorage with guarded failures).

import { create } from "zustand";
import { useEffect, useRef } from "react";
import { useTradingStore } from "../services/store.tsx";
import { safeStorage } from "../lib/safe-storage.ts";
import { toast } from "../services/toast.ts";
import { playAlertBeep } from "../lib/chart-plugins/drawing-tools/line-alerts.ts";
import {
  alertMessage,
  createAlert,
  evaluateAlerts,
  loadAlerts,
  saveAlerts,
  type AlertCondition,
  type AlertExpiry,
  type MidTicks,
  type PriceAlert,
} from "../lib/price-alerts.ts";

export interface AddAlertInput {
  symbol: string;
  price: number;
  condition: AlertCondition;
  once: boolean;
  expiry?: AlertExpiry;
}

interface PriceAlertsState {
  alerts: PriceAlert[];
  addAlert: (input: AddAlertInput) => void;
  removeAlert: (id: string) => void;
  clearTriggered: () => void;
  /** Engine-only: write back the post-evaluation state. */
  replaceAll: (alerts: PriceAlert[]) => void;
}

function persist(alerts: PriceAlert[]): void {
  saveAlerts(alerts, safeStorage.setItem);
}

export const usePriceAlertsStore = create<PriceAlertsState>((set, get) => ({
  alerts: loadAlerts((key) => safeStorage.getItem(key)),

  addAlert(input) {
    const alert = createAlert({
      symbol: input.symbol,
      price: input.price,
      condition: input.condition,
      once: input.once,
      expiry: input.expiry,
    });
    const next = [alert, ...get().alerts];
    persist(next);
    set({ alerts: next });
    toast.info(
      "Alert set",
      `${input.symbol} ${input.condition === "cross" ? "crossing" : input.condition} ${input.price}`,
    );
    // Best-effort: ask for browser-notification permission while we still have
    // the user gesture (the add-button click). Silent failure everywhere.
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch {
      // Some engines throw on requestPermission without a handler — fine.
    }
  },

  removeAlert(id) {
    const next = get().alerts.filter((a) => a.id !== id);
    persist(next);
    set({ alerts: next });
  },

  clearTriggered() {
    const next = get().alerts.filter((a) => a.triggeredAt == null);
    persist(next);
    set({ alerts: next });
  },

  replaceAll(alerts) {
    persist(alerts);
    set({ alerts });
  },
}));

/**
 * Mount ONCE (TradingPage). Subscribes to the trading store and evaluates
 * active alerts on every tick batch — no React re-renders per tick.
 */
export function usePriceAlertEngine(): void {
  // Mirror the store into a ref so the subscription callback never captures a
  // stale snapshot (and the react-hooks lint rules stay happy).
  const alertsRef = useRef<PriceAlert[]>(usePriceAlertsStore.getState().alerts);
  useEffect(
    () =>
      usePriceAlertsStore.subscribe((state) => {
        alertsRef.current = state.alerts;
      }),
    [],
  );

  useEffect(() => {
    const lastMid = new Map<string, number>();
    return useTradingStore.subscribe((state) => {
      const alerts = alertsRef.current;
      const active = alerts.filter((a) => a.triggeredAt == null);
      if (active.length === 0) return;

      // Build the mid snapshot for the symbols we actually track.
      const next: MidTicks = {};
      let anyNew = false;
      for (const alert of active) {
        const tick = state.ticks[alert.symbol];
        if (!tick) continue;
        const mid = (tick.bid + tick.ask) / 2;
        if (!Number.isFinite(mid) || mid <= 0) continue;
        next[alert.symbol] = mid;
        if (lastMid.get(alert.symbol) !== mid) anyNew = true;
      }
      if (!anyNew) return;

      const prev: MidTicks = {};
      for (const symbol of Object.keys(next)) {
        const p = lastMid.get(symbol);
        if (p != null) prev[symbol] = p;
      }

      const { fired, nextAlerts } = evaluateAlerts(alerts, prev, next);

      // Remember this step's mids even when nothing fired.
      for (const [symbol, mid] of Object.entries(next)) lastMid.set(symbol, mid);
      if (fired.length === 0) return;

      for (const alert of fired) {
        const mid = next[alert.symbol] ?? alert.price;
        toast.warning("Price alert", alertMessage(alert, mid));
        playAlertBeep();
        try {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Price alert", { body: alertMessage(alert, mid), tag: alert.id });
          }
        } catch {
          // Notification construction can throw on some mobile engines — best-effort.
        }
      }
      usePriceAlertsStore.getState().replaceAll(nextAlerts);
    });
  }, []);
}
