import { describe, expect, it } from "vitest";
import {
  atr,
  bollingerBands,
  donchianChannels,
  ema,
  hma,
  keltnerChannels,
  macd,
  obv,
  roc,
  rsi,
  sma,
  stochastic,
  stochRsi,
  vwap,
  williamsR,
  wma,
  type CandleData,
} from "@/lib/indicators";

/** Candles from a list of closes; high/low straddle the close by 1. */
function closes(values: number[]): CandleData[] {
  return values.map((close, i) => ({
    time: 1000 + i * 60,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 10,
  }));
}

const INVALID_PERIODS = [0, -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY];

describe("sma", () => {
  it("averages a rolling window", () => {
    const out = sma(closes([1, 2, 3, 4, 5]), 3);
    expect(out.map((p) => p.value)).toEqual([2, 3, 4]);
  });

  it("stamps each point with the closing bar's time", () => {
    const candles = closes([1, 2, 3]);
    expect(sma(candles, 3)[0]?.time).toBe(candles[2]!.time);
  });

  it("returns nothing when there is not enough history", () => {
    expect(sma(closes([1, 2]), 5)).toEqual([]);
  });

  it.each(INVALID_PERIODS)("returns nothing for period %p instead of throwing", (period) => {
    expect(() => sma(closes([1, 2, 3]), period)).not.toThrow();
    expect(sma(closes([1, 2, 3]), period)).toEqual([]);
  });
});

describe("ema", () => {
  it("seeds from the SMA then applies the multiplier", () => {
    const out = ema(closes([1, 2, 3, 4]), 3);
    expect(out[0]?.value).toBe(2); // SMA seed of 1,2,3
    // k = 2/(3+1) = 0.5 → 4*0.5 + 2*0.5 = 3
    expect(out[1]?.value).toBe(3);
  });

  it.each(INVALID_PERIODS)("returns nothing for period %p", (period) => {
    expect(ema(closes([1, 2, 3]), period)).toEqual([]);
  });
});

describe("rsi", () => {
  it("is 100 when every bar gains", () => {
    const out = rsi(closes([1, 2, 3, 4, 5, 6]), 3);
    expect(out[0]?.value).toBe(100);
  });

  it("is 0 when every bar loses", () => {
    const out = rsi(closes([6, 5, 4, 3, 2, 1]), 3);
    expect(out[0]?.value).toBe(0);
  });

  it("is neutral, not overbought, on a flat series", () => {
    const out = rsi(closes([5, 5, 5, 5, 5, 5]), 3);
    expect(out[0]?.value).toBe(50);
  });

  it("stays within 0..100", () => {
    const out = rsi(closes([10, 12, 11, 15, 9, 14, 13, 18, 7, 20]), 4);
    for (const point of out) {
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.value).toBeLessThanOrEqual(100);
    }
  });

  it.each(INVALID_PERIODS)("returns nothing for period %p", (period) => {
    expect(rsi(closes([1, 2, 3, 4]), period)).toEqual([]);
  });
});

describe("macd", () => {
  it("lines up the histogram with macd minus signal", () => {
    const series = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const { macd: line, signal, histogram } = macd(closes(series), 12, 26, 9);

    expect(line.length).toBeGreaterThan(0);
    expect(signal.length).toBeGreaterThan(0);
    expect(histogram).toHaveLength(signal.length);

    const byTime = new Map(line.map((p) => [p.time, p.value]));
    for (const h of histogram) {
      const s = signal.find((p) => p.time === h.time)!;
      expect(h.value).toBeCloseTo(byTime.get(h.time)! - s.value, 10);
    }
  });

  it("returns empty series for an invalid period", () => {
    expect(macd(closes([1, 2, 3]), 0, 26, 9)).toEqual({ macd: [], signal: [], histogram: [] });
  });
});

describe("bollingerBands", () => {
  it("collapses the bands when price is flat", () => {
    const { upper, middle, lower } = bollingerBands(closes([5, 5, 5, 5, 5]), 3);
    expect(middle[0]?.value).toBe(5);
    expect(upper[0]?.value).toBe(5);
    expect(lower[0]?.value).toBe(5);
  });

  it("places the bands symmetrically around the mean", () => {
    const { upper, middle, lower } = bollingerBands(closes([1, 2, 3, 4, 5]), 3);
    for (let i = 0; i < middle.length; i += 1) {
      const spread = upper[i]!.value - middle[i]!.value;
      expect(middle[i]!.value - lower[i]!.value).toBeCloseTo(spread, 10);
    }
  });

  it.each(INVALID_PERIODS)("returns empty bands for period %p", (period) => {
    expect(bollingerBands(closes([1, 2, 3]), period)).toEqual({
      upper: [],
      middle: [],
      lower: [],
    });
  });
});

describe("atr", () => {
  it("measures the true range of a steady series", () => {
    // Each bar spans close±1 → true range 2 once the gap is included.
    const out = atr(closes([10, 10, 10, 10, 10]), 3);
    expect(out[0]?.value).toBeCloseTo(2, 10);
  });

  it("is never negative", () => {
    const out = atr(closes([10, 14, 9, 17, 6, 12, 11]), 3);
    for (const point of out) expect(point.value).toBeGreaterThanOrEqual(0);
  });

  it.each(INVALID_PERIODS)("returns nothing for period %p", (period) => {
    expect(atr(closes([1, 2, 3, 4]), period)).toEqual([]);
  });
});

describe("stochastic", () => {
  it("reads 100 when the close sits at the window high", () => {
    const candles = closes([1, 2, 3]);
    const last = candles[2]!;
    last.high = last.close; // close == highest high
    const { k } = stochastic(candles, 3, 2);
    expect(k[k.length - 1]?.value).toBeCloseTo(100, 6);
  });

  it("is neutral when the window has no range", () => {
    const flat: CandleData[] = [0, 1, 2].map((i) => ({
      time: 1000 + i,
      open: 5,
      high: 5,
      low: 5,
      close: 5,
      volume: 1,
    }));
    const { k } = stochastic(flat, 3, 2);
    expect(k[0]?.value).toBe(50);
  });

  it.each(INVALID_PERIODS)("returns empty lines for period %p", (period) => {
    expect(stochastic(closes([1, 2, 3, 4]), period)).toEqual({ k: [], d: [] });
  });
});

describe("vwap", () => {
  it("weights by volume", () => {
    const candles: CandleData[] = [
      { time: 1, open: 10, high: 10, low: 10, close: 10, volume: 1 },
      { time: 2, open: 20, high: 20, low: 20, close: 20, volume: 3 },
    ];
    // (10*1 + 20*3) / 4 = 17.5
    expect(vwap(candles)[1]?.value).toBeCloseTo(17.5, 10);
  });

  it("falls back to the typical price before any volume trades", () => {
    const candles: CandleData[] = [
      { time: 1, open: 9, high: 12, low: 6, close: 9, volume: 0 },
    ];
    const [point] = vwap(candles);
    expect(point?.value).toBeCloseTo(9, 10);
    expect(Number.isNaN(point!.value)).toBe(false);
  });

  it("never produces NaN for a zero-volume series", () => {
    const candles = closes([1, 2, 3]).map((c) => ({ ...c, volume: 0 }));
    for (const point of vwap(candles)) {
      expect(Number.isFinite(point.value)).toBe(true);
    }
  });
});

// ── Feature 7: indicator batch 1 ─────────────────────────────

describe("wma", () => {
  it("weights the newest bar highest", () => {
    // WMA(3) of [1,2,3] = (3*3 + 2*2 + 1*1) / 6 = 14/6
    const pts = wma(closes([1, 2, 3]), 3);
    expect(pts).toHaveLength(1);
    expect(pts[0]!.value).toBeCloseTo(14 / 6, 10);
  });

  it("matches sma on a flat series", () => {
    const pts = wma(closes([5, 5, 5, 5, 5]), 4);
    for (const p of pts) expect(p.value).toBeCloseTo(5, 10);
  });

  it("returns nothing when there is not enough history", () => {
    expect(wma(closes([1, 2]), 3)).toEqual([]);
  });
});

describe("hma", () => {
  it("is more responsive than the sma on a rising series", () => {
    const data = closes(Array.from({ length: 30 }, (_, i) => 10 + i));
    const h = hma(data, 10);
    const s = sma(data, 10);
    const lastH = h[h.length - 1]!.value;
    const lastS = s[s.length - 1]!.value;
    expect(lastH).toBeGreaterThan(lastS);
    expect(Number.isFinite(lastH)).toBe(true);
  });

  it("returns nothing for too-short input", () => {
    expect(hma(closes([1, 2, 3]), 10)).toEqual([]);
  });
});

describe("keltnerChannels", () => {
  it("places the bands symmetrically around the EMA basis", () => {
    const data = closes([10, 11, 12, 11, 10, 12, 13, 12, 11, 12, 13, 14, 13, 12, 13, 14, 15, 14, 13, 14, 15, 16]);
    const { upper, middle, lower } = keltnerChannels(data, 10, 2);
    expect(upper.length).toBe(middle.length);
    expect(lower.length).toBe(middle.length);
    for (let i = 0; i < middle.length; i++) {
      expect(upper[i]!.value).toBeCloseTo(middle[i]!.value + (middle[i]!.value - lower[i]!.value), 10);
      expect(upper[i]!.value).toBeGreaterThanOrEqual(middle[i]!.value);
      expect(lower[i]!.value).toBeLessThanOrEqual(middle[i]!.value);
    }
  });

  it("returns empty series for too-short input", () => {
    const r = keltnerChannels(closes([1, 2, 3]), 20, 2);
    expect(r.upper).toEqual([]);
    expect(r.middle).toEqual([]);
    expect(r.lower).toEqual([]);
  });
});

describe("donchianChannels", () => {
  it("upper is the highest high and lower the lowest low of the window", () => {
    const data: CandleData[] = [
      { time: 1, open: 5, high: 6, low: 4, close: 5 },
      { time: 2, open: 5, high: 8, low: 5, close: 7 },
      { time: 3, open: 7, high: 7, low: 3, close: 4 },
    ];
    const { upper, lower, middle } = donchianChannels(data, 3);
    expect(upper[0]!.value).toBe(8);
    expect(lower[0]!.value).toBe(3);
    expect(middle[0]!.value).toBeCloseTo(5.5, 10);
  });

  it("is inclusive of the current bar", () => {
    const data: CandleData[] = [
      { time: 1, open: 1, high: 1, low: 1, close: 1 },
      { time: 2, open: 2, high: 9, low: 1, close: 2 },
    ];
    const { upper } = donchianChannels(data, 2);
    expect(upper[0]!.value).toBe(9);
  });
});

describe("stochRsi", () => {
  it("stays within 0..100 and tracks the RSI's range position", () => {
    // RSI(14) needs at least 15 bars before its first point, and the
    // stochastic then needs its own 14-point window on top.
    const data = closes([10, 11, 10, 12, 11, 9, 10, 13, 12, 11, 12, 14, 13, 12, 15, 14, 13, 12, 14, 16, 15, 13, 12, 14, 16, 18, 17, 19, 21, 20, 22, 24, 23, 25, 27, 26, 28, 30, 29, 31, 33, 32, 34, 36, 35, 37, 39, 38, 40, 42]);
    const { k, d } = stochRsi(data, 14, 14, 3);
    expect(k.length).toBeGreaterThan(0);
    expect(d.length).toBeGreaterThan(0);
    for (const p of [...k, ...d]) {
      expect(p.value).toBeGreaterThanOrEqual(0);
      expect(p.value).toBeLessThanOrEqual(100);
    }
  });

  it("pins to 100 when the RSI hits a fresh window high, 0 at a fresh low", () => {
    // A sawtooth makes the RSI oscillate instead of saturating at 100, so the
    // stochastic can actually hit both rails.
    const data = closes([10, 12, 10, 13, 11, 14, 12, 15, 13, 16, 14, 17, 15, 18, 16, 19, 17, 20, 18, 21, 19, 22, 20, 23, 21, 24, 22, 25, 23, 26, 24, 27, 25, 28, 26, 29, 27, 30, 28, 31, 29, 32, 30, 33, 31, 34, 32, 35, 33, 36, 34, 37, 35, 38, 36, 39, 37, 40, 38, 41, 39, 42, 40, 43, 41, 44, 42, 45, 43, 46, 44, 47, 45, 48, 46, 49, 47, 50, 48, 51]);
    const { k } = stochRsi(data, 5, 5, 3);
    const max = Math.max(...k.map((p) => p.value));
    const min = Math.min(...k.map((p) => p.value));
    expect(max).toBeGreaterThan(90);
    expect(min).toBeLessThan(10);
  });
});

describe("obv", () => {
  it("adds volume on up closes and subtracts on down closes", () => {
    const data: CandleData[] = [
      { time: 1, open: 1, high: 2, low: 1, close: 1, volume: 10 },
      { time: 2, open: 2, high: 3, low: 2, close: 2, volume: 5 }, // up → +5
      { time: 3, open: 2, high: 2, low: 1, close: 1, volume: 7 }, // down → −7
      { time: 4, open: 1, high: 1, low: 1, close: 1, volume: 3 }, // flat → +0
    ];
    const pts = obv(data);
    expect(pts.map((p) => p.value)).toEqual([0, 5, -2, -2]);
  });

  it("returns nothing for an empty series", () => {
    expect(obv([])).toEqual([]);
  });
});

describe("williamsR", () => {
  it("is −0 at the window high and −100 at the window low", () => {
    const atHigh: CandleData[] = [
      { time: 1, open: 1, high: 2, low: 1, close: 1 },
      { time: 2, open: 2, high: 10, low: 1, close: 10 }, // close == HH
    ];
    const atLow: CandleData[] = [
      { time: 1, open: 9, high: 10, low: 9, close: 10 },
      { time: 2, open: 2, high: 10, low: 1, close: 1 }, // close == LL
    ];
    expect(williamsR(atHigh, 2)[0]!.value).toBeCloseTo(0, 10);
    expect(williamsR(atLow, 2)[0]!.value).toBeCloseTo(-100, 10);
  });

  it("never produces NaN on a flat series", () => {
    const pts = williamsR(closes([5, 5, 5, 5]), 3);
    for (const p of pts) expect(Number.isFinite(p.value)).toBe(true);
  });
});

describe("roc", () => {
  it("computes percent change over the period", () => {
    // ROC(2) at i=2: (3/1 − 1) × 100 = 200
    const pts = roc(closes([1, 2, 3]), 2);
    expect(pts).toHaveLength(1);
    expect(pts[0]!.value).toBeCloseTo(200, 10);
  });

  it("is 0 for a flat series", () => {
    const pts = roc(closes([4, 4, 4, 4, 4]), 2);
    for (const p of pts) expect(p.value).toBeCloseTo(0, 10);
  });

  it("returns nothing when history is shorter than the period", () => {
    expect(roc(closes([1, 2]), 2)).toEqual([]);
  });
});
