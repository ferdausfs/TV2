// Tests for the price-alert evaluator (src/lib/price-alerts.ts) — roadmap
// feature 1. Pure logic: conditions, once/every-time, expiry, cooldown,
// persistence load/save.
import { describe, expect, it } from "vitest";
import {
  alertMessage,
  conditionMet,
  createAlert,
  evaluateAlerts,
  expiryToTimestamp,
  isExpired,
  loadAlerts,
  saveAlerts,
  type PriceAlert,
} from "../lib/price-alerts.ts";

const NOW = 1_700_000_000_000;

function alert(overrides: Partial<PriceAlert> = {}): PriceAlert {
  return {
    id: "a1",
    symbol: "BTCUSDT",
    price: 100,
    condition: "cross",
    once: true,
    expiresAt: 0,
    createdAt: NOW - 1000,
    ...overrides,
  };
}

describe("conditionMet", () => {
  it("fires on any straddle for cross", () => {
    const a = alert({ price: 100 });
    expect(conditionMet(a, 99, 101)).toBe(true);
    expect(conditionMet(a, 101, 99)).toBe(true);
    expect(conditionMet(a, 99, 100)).toBe(true); // touching counts as crossing
    expect(conditionMet(a, 101, 102)).toBe(false);
    expect(conditionMet(a, 98, 99)).toBe(false);
  });

  it("fires above only when rising through the level", () => {
    const a = alert({ condition: "above", price: 100 });
    expect(conditionMet(a, 99, 101)).toBe(true);
    expect(conditionMet(a, 101, 99)).toBe(false); // falling through ≠ above-trigger
    expect(conditionMet(a, 100, 101)).toBe(false); // already at/above
  });

  it("fires below only when falling through the level", () => {
    const a = alert({ condition: "below", price: 100 });
    expect(conditionMet(a, 101, 99)).toBe(true);
    expect(conditionMet(a, 99, 101)).toBe(false);
  });
});

describe("evaluateAlerts", () => {
  it("fires a once alert and deactivates it", () => {
    const a = alert({ once: true });
    const { fired, nextAlerts } = evaluateAlerts([a], { BTCUSDT: 99 }, { BTCUSDT: 101 }, NOW);
    expect(fired).toHaveLength(1);
    expect(nextAlerts[0]?.triggeredAt).toBe(NOW);
    // Second tick does nothing — the alert is spent.
    const second = evaluateAlerts(nextAlerts, { BTCUSDT: 101 }, { BTCUSDT: 99 }, NOW + 1);
    expect(second.fired).toHaveLength(0);
  });

  it("refires an every-time alert but respects the 30s cooldown", () => {
    const a = alert({ once: false });
    const first = evaluateAlerts([a], { BTCUSDT: 99 }, { BTCUSDT: 101 }, NOW);
    expect(first.fired).toHaveLength(1);
    expect(first.nextAlerts[0]?.lastFiredAt).toBe(NOW);

    // Inside the cooldown: cross again, no fire.
    const second = evaluateAlerts(
      first.nextAlerts,
      { BTCUSDT: 101 },
      { BTCUSDT: 99 },
      NOW + 10_000,
    );
    expect(second.fired).toHaveLength(0);

    // After the cooldown: fires again.
    const third = evaluateAlerts(
      second.nextAlerts,
      { BTCUSDT: 99 },
      { BTCUSDT: 101 },
      NOW + 31_000,
    );
    expect(third.fired).toHaveLength(1);
  });

  it("ignores symbols without ticks", () => {
    const a = alert({ symbol: "ETHUSDT" });
    const { fired } = evaluateAlerts([a], { BTCUSDT: 99 }, { BTCUSDT: 101 }, NOW);
    expect(fired).toHaveLength(0);
  });

  it("expires lazily: flips to triggeredAt and stops evaluating", () => {
    const a = alert({ expiresAt: NOW - 1 });
    expect(isExpired(a, NOW)).toBe(true);
    const { fired, nextAlerts } = evaluateAlerts([a], { BTCUSDT: 99 }, { BTCUSDT: 101 }, NOW);
    expect(fired).toHaveLength(0);
    expect(nextAlerts[0]?.triggeredAt).toBe(NOW);
    const again = evaluateAlerts(nextAlerts, { BTCUSDT: 99 }, { BTCUSDT: 101 }, NOW + 1);
    expect(again.nextAlerts[0]?.triggeredAt).toBe(NOW); // stable, not re-flipped
  });

  it("leaves already-triggered alerts alone", () => {
    const a = alert({ triggeredAt: NOW - 500 });
    const { fired, nextAlerts } = evaluateAlerts([a], { BTCUSDT: 99 }, { BTCUSDT: 101 }, NOW);
    expect(fired).toHaveLength(0);
    expect(nextAlerts[0]).toEqual(a);
  });
});

describe("expiry + helpers", () => {
  it("expiryToTimestamp maps presets", () => {
    expect(expiryToTimestamp("none", NOW)).toBe(0);
    expect(expiryToTimestamp("1h", NOW)).toBe(NOW + 3_600_000);
    expect(expiryToTimestamp("1w", NOW)).toBe(NOW + 604_800_000);
  });

  it("alertMessage reads sensibly", () => {
    expect(alertMessage(alert({ price: 100 }), 101)).toContain("BTCUSDT");
  });

  it("createAlert stamps fields", () => {
    const a = createAlert({ symbol: "BTCUSDT", price: 5, condition: "above", once: false, expiry: "4h", now: NOW });
    expect(a.expiresAt).toBe(NOW + 14_400_000);
    expect(a.id).toBeTruthy();
  });
});

describe("persistence", () => {
  it("round-trips through a storage-like map", () => {
    const mem = new Map<string, string>();
    const alerts = [
      createAlert({ symbol: "BTCUSDT", price: 1, condition: "cross", once: true, now: NOW }),
      createAlert({ symbol: "ETHUSDT", price: 2, condition: "below", once: false, now: NOW }),
    ];
    saveAlerts(alerts, (k, v) => (mem.set(k, v), true));
    const loaded = loadAlerts((k) => mem.get(k) ?? null);
    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.price).toBe(1);
    expect(loaded[1]?.condition).toBe("below");
  });

  it("degrades on corrupt data", () => {
    expect(loadAlerts(() => "not json")).toEqual([]);
    expect(loadAlerts(() => JSON.stringify({ nope: 1 }))).toEqual([]);
    expect(loadAlerts(() => null)).toEqual([]);
  });

  it("caps saved alerts at 100", () => {
    const mem = new Map<string, string>();
    const many = Array.from({ length: 150 }, (_, i) =>
      createAlert({ symbol: "S", price: i, condition: "cross", once: true, now: NOW + i }),
    );
    saveAlerts(many, (k, v) => (mem.set(k, v), true));
    expect(loadAlerts((k) => mem.get(k) ?? null)).toHaveLength(100);
  });
});
