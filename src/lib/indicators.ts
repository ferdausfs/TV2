/**
 * Technical Indicator Calculations
 * Pure functions for computing chart indicators from OHLCV candle data.
 */

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface IndicatorPoint {
  time: number;
  value: number;
}

/**
 * Coerce a period to a usable positive integer, or null when it is unusable.
 *
 * Without this a zero, negative, fractional or missing period indexed off the
 * front of the candle array (`candles[-1]!.close`) and threw inside render,
 * which the ErrorBoundary turns into a blank terminal. Registry entries are
 * fixed today, but adding an indicator is a documented extension point.
 */
function validPeriod(period: number | undefined | null, min = 1): number | null {
  if (period == null || !Number.isFinite(period)) return null;
  const floored = Math.floor(period);
  return floored >= min ? floored : null;
}

// ── Simple Moving Average ────────────────────────────────────
export function sma(candles: CandleData[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const p = validPeriod(period);
  if (p === null || candles.length < p) return result;
  period = p;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i]!.close;

  result.push({ time: candles[period - 1]!.time, value: sum / period });

  for (let i = period; i < candles.length; i++) {
    sum += candles[i]!.close - candles[i - period]!.close;
    result.push({ time: candles[i]!.time, value: sum / period });
  }
  return result;
}

// ── Exponential Moving Average ───────────────────────────────
export function ema(candles: CandleData[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const p = validPeriod(period);
  if (p === null || candles.length < p) return result;
  period = p;

  const k = 2 / (period + 1);

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i]!.close;
  let prev = sum / period;
  result.push({ time: candles[period - 1]!.time, value: prev });

  for (let i = period; i < candles.length; i++) {
    prev = candles[i]!.close * k + prev * (1 - k);
    result.push({ time: candles[i]!.time, value: prev });
  }
  return result;
}

/**
 * Wilder's RSI from average gain/loss. A flat stretch has no gains *and* no
 * losses — that is neutral (50), not maximally overbought, which is what the
 * bare `avgLoss === 0 → 100` rule used to report.
 */
function rsiFrom(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

// ── Relative Strength Index ──────────────────────────────────
export function rsi(candles: CandleData[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const p = validPeriod(period);
  if (p === null || candles.length < p + 1) return result;
  period = p;

  let avgGain = 0;
  let avgLoss = 0;

  // First period
  for (let i = 1; i <= period; i++) {
    const change = candles[i]!.close - candles[i - 1]!.close;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  result.push({ time: candles[period]!.time, value: rsiFrom(avgGain, avgLoss) });

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i]!.close - candles[i - 1]!.close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push({ time: candles[i]!.time, value: rsiFrom(avgGain, avgLoss) });
  }
  return result;
}

// ── MACD ─────────────────────────────────────────────────────
export interface MACDResult {
  macd: IndicatorPoint[];
  signal: IndicatorPoint[];
  histogram: IndicatorPoint[];
}

export function macd(
  candles: CandleData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MACDResult {
  const fast = validPeriod(fastPeriod);
  const slow = validPeriod(slowPeriod);
  const signalLen = validPeriod(signalPeriod);
  if (fast === null || slow === null || signalLen === null) {
    return { macd: [], signal: [], histogram: [] };
  }
  signalPeriod = signalLen;
  const fastEma = ema(candles, fast);
  const slowEma = ema(candles, slow);

  // Align by time
  const slowTimes = new Map(slowEma.map((p) => [p.time, p.value]));
  const macdLine: IndicatorPoint[] = [];
  for (const fp of fastEma) {
    const sv = slowTimes.get(fp.time);
    if (sv !== undefined) {
      macdLine.push({ time: fp.time, value: fp.value - sv });
    }
  }

  // Signal line = EMA of MACD line
  const signalLine: IndicatorPoint[] = [];
  if (macdLine.length >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) sum += macdLine[i]!.value;
    let prev = sum / signalPeriod;
    signalLine.push({ time: macdLine[signalPeriod - 1]!.time, value: prev });

    for (let i = signalPeriod; i < macdLine.length; i++) {
      prev = macdLine[i]!.value * k + prev * (1 - k);
      signalLine.push({ time: macdLine[i]!.time, value: prev });
    }
  }

  // Histogram = MACD - Signal
  const signalTimes = new Map(signalLine.map((p) => [p.time, p.value]));
  const histogram: IndicatorPoint[] = [];
  for (const mp of macdLine) {
    const sv = signalTimes.get(mp.time);
    if (sv !== undefined) {
      histogram.push({ time: mp.time, value: mp.value - sv });
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

// ── Bollinger Bands ──────────────────────────────────────────
export interface BollingerResult {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
}

export function bollingerBands(
  candles: CandleData[],
  period = 20,
  stdDevMultiplier = 2,
): BollingerResult {
  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  const p = validPeriod(period);
  if (p === null || candles.length < p) return { upper, middle, lower };
  period = p;

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j]!.close;
    const avg = sum / period;

    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += (candles[j]!.close - avg) ** 2;
    }
    const stdDev = Math.sqrt(variance / period);

    const t = candles[i]!.time;
    middle.push({ time: t, value: avg });
    upper.push({ time: t, value: avg + stdDevMultiplier * stdDev });
    lower.push({ time: t, value: avg - stdDevMultiplier * stdDev });
  }

  return { upper, middle, lower };
}

// ── Average True Range ───────────────────────────────────────
export function atr(candles: CandleData[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const p = validPeriod(period);
  if (p === null || candles.length < p + 1) return result;
  period = p;

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i]!.high - candles[i]!.low,
      Math.abs(candles[i]!.high - candles[i - 1]!.close),
      Math.abs(candles[i]!.low - candles[i - 1]!.close),
    );
    trs.push(tr);
  }

  let sum = 0;
  for (let i = 0; i < period; i++) sum += trs[i]!;
  let prev = sum / period;
  result.push({ time: candles[period]!.time, value: prev });

  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]!) / period;
    result.push({ time: candles[i + 1]!.time, value: prev });
  }
  return result;
}

// ── Stochastic Oscillator ────────────────────────────────────
export interface StochasticResult {
  k: IndicatorPoint[];
  d: IndicatorPoint[];
}

export function stochastic(candles: CandleData[], kPeriod = 14, dPeriod = 3): StochasticResult {
  const kLine: IndicatorPoint[] = [];
  const kLen = validPeriod(kPeriod);
  const dLen = validPeriod(dPeriod);
  if (kLen === null || dLen === null || candles.length < kLen) return { k: [], d: [] };
  kPeriod = kLen;
  dPeriod = dLen;

  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j]!.high > highest) highest = candles[j]!.high;
      if (candles[j]!.low < lowest) lowest = candles[j]!.low;
    }
    const range = highest - lowest;
    const kVal = range === 0 ? 50 : ((candles[i]!.close - lowest) / range) * 100;
    kLine.push({ time: candles[i]!.time, value: kVal });
  }

  // %D = SMA of %K
  const dLine: IndicatorPoint[] = [];
  if (kLine.length >= dPeriod) {
    let sum = 0;
    for (let i = 0; i < dPeriod; i++) sum += kLine[i]!.value;
    dLine.push({ time: kLine[dPeriod - 1]!.time, value: sum / dPeriod });
    for (let i = dPeriod; i < kLine.length; i++) {
      sum += kLine[i]!.value - kLine[i - dPeriod]!.value;
      dLine.push({ time: kLine[i]!.time, value: sum / dPeriod });
    }
  }

  return { k: kLine, d: dLine };
}

// ── Volume Weighted Average Price ────────────────────────────
export function vwap(candles: CandleData[]): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  let cumVolPrice = 0;
  let cumVol = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = Number.isFinite(c.volume) && (c.volume ?? 0) > 0 ? c.volume! : 0;
    cumVolPrice += typicalPrice * vol;
    cumVol += vol;
    // Before any volume has traded VWAP is just the typical price — dividing by
    // a zero denominator produced NaN and broke the whole series.
    result.push({ time: c.time, value: cumVol > 0 ? cumVolPrice / cumVol : typicalPrice });
  }
  return result;
}

// ── Weighted Moving Average ──────────────────────────────────
// Linearly weighted: the newest bar gets weight n, the oldest 1.
export function wma(candles: CandleData[], period: number): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const p = validPeriod(period);
  if (p === null || candles.length < p) return result;
  const denom = (p * (p + 1)) / 2;

  for (let i = p - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < p; j++) sum += candles[i - j]!.close * (p - j);
    result.push({ time: candles[i]!.time, value: sum / denom });
  }
  return result;
}

// ── Hull Moving Average ──────────────────────────────────────
// HMA(n) = WMA(2·WMA(n/2) − WMA(n), √n). Composed from the WMA above on the
// same candle array (periods rounded down; √n ≥ 1).
export function hma(candles: CandleData[], period: number): IndicatorPoint[] {
  const p = validPeriod(period, 2);
  if (p === null || candles.length < p) return [];
  const half = Math.max(1, Math.floor(p / 2));
  const sqrtLen = Math.max(1, Math.floor(Math.sqrt(p)));

  const wmaFull = wma(candles, p);
  const wmaHalf = wma(candles, half);
  if (wmaFull.length === 0 || wmaHalf.length === 0) return [];

  // Align the two WMAs on their common TAIL: wmaHalf is the LONGER series
  // (smaller window → starts earlier), so its index i maps to wmaFull's
  // index i + offset where offset = wmaHalf.length - wmaFull.length.
  const offset = wmaHalf.length - wmaFull.length;
  const diff: IndicatorPoint[] = [];
  for (let i = 0; i < wmaFull.length; i++) {
    diff.push({
      time: wmaFull[i]!.time,
      value: 2 * wmaHalf[i + offset]!.value - wmaFull[i]!.value,
    });
  }
  // The diff series is evenly spaced in time — run WMA over it by treating
  // each point as a synthetic candle.
  const synthetic = diff.map((d) => ({
    time: d.time,
    open: d.value,
    high: d.value,
    low: d.value,
    close: d.value,
  }));
  return wma(synthetic, sqrtLen);
}

// ── Keltner Channels ─────────────────────────────────────────
export interface KeltnerResult {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
}

// Basis = EMA(period), bands = basis ± multiplier·ATR(period).
export function keltnerChannels(
  candles: CandleData[],
  period = 20,
  multiplier = 2,
): KeltnerResult {
  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  const basis = ema(candles, period);
  const range = atr(candles, period);
  if (basis.length === 0 || range.length === 0) return { upper, middle, lower };

  // ATR starts one bar later than EMA (it needs a previous close) — align on
  // the common tail.
  const offset = basis.length - range.length;
  for (let i = 0; i < range.length; i++) {
    const b = basis[i + offset]!.value;
    const a = range[i]!.value;
    const t = range[i]!.time;
    middle.push({ time: t, value: b });
    upper.push({ time: t, value: b + multiplier * a });
    lower.push({ time: t, value: b - multiplier * a });
  }
  return { upper, middle, lower };
}

// ── Donchian Channels ────────────────────────────────────────
export interface DonchianResult {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
}

// Highest-high / lowest-low of the trailing window (inclusive of the current
// bar); middle = midpoint.
export function donchianChannels(candles: CandleData[], period = 20): DonchianResult {
  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  const p = validPeriod(period);
  if (p === null || candles.length < p) return { upper, middle, lower };

  for (let i = p - 1; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - p + 1; j <= i; j++) {
      if (candles[j]!.high > highest) highest = candles[j]!.high;
      if (candles[j]!.low < lowest) lowest = candles[j]!.low;
    }
    const t = candles[i]!.time;
    upper.push({ time: t, value: highest });
    lower.push({ time: t, value: lowest });
    middle.push({ time: t, value: (highest + lowest) / 2 });
  }
  return { upper, middle, lower };
}

// ── Stochastic RSI ───────────────────────────────────────────
// Stoch of the RSI series: %K = (RSI − min(RSI,n)) / (max(RSI,n) − min(RSI,n))
// over the trailing window; %D = SMA(3) of %K.
export function stochRsi(
  candles: CandleData[],
  rsiPeriod = 14,
  stochPeriod = 14,
  dPeriod = 3,
): StochasticResult {
  const kLine: IndicatorPoint[] = [];
  const rsiSeries = rsi(candles, rsiPeriod);
  const sLen = validPeriod(stochPeriod);
  const dLen = validPeriod(dPeriod);
  if (rsiSeries.length === 0 || sLen === null || dLen === null || rsiSeries.length < sLen) {
    return { k: [], d: [] };
  }

  for (let i = sLen - 1; i < rsiSeries.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - sLen + 1; j <= i; j++) {
      if (rsiSeries[j]!.value > highest) highest = rsiSeries[j]!.value;
      if (rsiSeries[j]!.value < lowest) lowest = rsiSeries[j]!.value;
    }
    const range = highest - lowest;
    const kVal = range === 0 ? 50 : ((rsiSeries[i]!.value - lowest) / range) * 100;
    kLine.push({ time: rsiSeries[i]!.time, value: kVal });
  }

  const dLine: IndicatorPoint[] = [];
  if (kLine.length >= dLen) {
    let sum = 0;
    for (let i = 0; i < dLen; i++) sum += kLine[i]!.value;
    dLine.push({ time: kLine[dLen - 1]!.time, value: sum / dLen });
    for (let i = dLen; i < kLine.length; i++) {
      sum += kLine[i]!.value - kLine[i - dLen]!.value;
      dLine.push({ time: kLine[i]!.time, value: sum / dLen });
    }
  }
  return { k: kLine, d: dLine };
}

// ── On-Balance Volume ────────────────────────────────────────
// Cumulative volume signed by close-to-close direction; starts at the first
// bar's volume.
export function obv(candles: CandleData[]): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  if (candles.length === 0) return result;
  let running = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i > 0) {
      const prevClose = candles[i - 1]!.close;
      const close = candles[i]!.close;
      const vol = Number.isFinite(candles[i]!.volume) ? candles[i]!.volume ?? 0 : 0;
      if (close > prevClose) running += vol;
      else if (close < prevClose) running -= vol;
    }
    result.push({ time: candles[i]!.time, value: running });
  }
  return result;
}

// ── Williams %R ──────────────────────────────────────────────
// (HH − C) / (HH − LL) × −100 over the trailing window.
export function williamsR(candles: CandleData[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const p = validPeriod(period);
  if (p === null || candles.length < p) return result;

  for (let i = p - 1; i < candles.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - p + 1; j <= i; j++) {
      if (candles[j]!.high > highest) highest = candles[j]!.high;
      if (candles[j]!.low < lowest) lowest = candles[j]!.low;
    }
    const range = highest - lowest;
    const value = range === 0 ? -50 : ((highest - candles[i]!.close) / range) * -100;
    result.push({ time: candles[i]!.time, value });
  }
  return result;
}

// ── Rate of Change ───────────────────────────────────────────
// 100 × (C / C[n periods ago] − 1).
export function roc(candles: CandleData[], period = 9): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const p = validPeriod(period);
  if (p === null || candles.length <= p) return result;

  for (let i = p; i < candles.length; i++) {
    const base = candles[i - p]!.close;
    const value = base === 0 ? 0 : (candles[i]!.close / base - 1) * 100;
    result.push({ time: candles[i]!.time, value });
  }
  return result;
}

// ── ADX (Wilder) ─────────────────────────────────────────────
export interface AdxResult {
  adx: IndicatorPoint[];
  plusDi: IndicatorPoint[];
  minusDi: IndicatorPoint[];
}

/**
 * Wilder's ADX: DI+/DI− from smoothed +DM/−DM/TR, DX = 100·|DI+−DI−|/(DI++DI−),
 * ADX = Wilder-smoothed DX. Empty until the first full window (2n bars).
 */
export function adx(candles: CandleData[], period = 14): AdxResult {
  const out: AdxResult = { adx: [], plusDi: [], minusDi: [] };
  const p = validPeriod(period);
  if (p === null || candles.length < p * 2) return out;

  // Wilder smoothing = EMA with α = 1/p.
  const smooth = (seed: number, values: number[]): number[] => {
    const series: number[] = [seed];
    for (let i = 1; i < values.length; i++) {
      series.push(series[i - 1]! - series[i - 1]! / p + values[i]!);
    }
    return series;
  };

  const trs: number[] = [];
  const plusDms: number[] = [];
  const minusDms: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i]!;
    const prev = candles[i - 1]!;
    const upMove = cur.high - prev.high;
    const downMove = prev.low - cur.low;
    trs.push(Math.max(cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close)));
    plusDms.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDms.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Seed with the simple sum of the first window, then Wilder-smooth.
  const sum = (arr: number[], end: number) => arr.slice(0, end).reduce((a, b) => a + b, 0);
  const trSmooth = smooth(sum(trs, p), trs.slice(p));
  const plusSmooth = smooth(sum(plusDms, p), plusDms.slice(p));
  const minusSmooth = smooth(sum(minusDms, p), minusDms.slice(p));

  const dxs: Array<{ time: number; dx: number }> = [];
  for (let i = 0; i < trSmooth.length; i++) {
    const barIdx = i + p; // candle index of this smoothed point
    const tr = trSmooth[i]!;
    if (tr <= 0) continue;
    const plusDi = (plusSmooth[i]! / tr) * 100;
    const minusDi = (minusSmooth[i]! / tr) * 100;
    const denom = plusDi + minusDi;
    const dx = denom === 0 ? 0 : (Math.abs(plusDi - minusDi) / denom) * 100;
    const time = candles[barIdx]!.time;
    out.plusDi.push({ time, value: plusDi });
    out.minusDi.push({ time, value: minusDi });
    dxs.push({ time, dx });
  }

  // ADX = Wilder-smoothed DX over p points.
  if (dxs.length >= p) {
    let adxVal = dxs.slice(0, p).reduce((a, b) => a + b.dx, 0) / p;
    out.adx.push({ time: dxs[p - 1]!.time, value: adxVal });
    for (let i = p; i < dxs.length; i++) {
      adxVal = (adxVal * (p - 1) + dxs[i]!.dx) / p;
      out.adx.push({ time: dxs[i]!.time, value: adxVal });
    }
  }
  return out;
}

// ── Commodity Channel Index ──────────────────────────────────
// CCI = (TP − SMA(TP,n)) / (0.015 × mean deviation of TP over n).
export function cci(candles: CandleData[], period = 20): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const p = validPeriod(period);
  if (p === null || candles.length < p) return result;

  const tp = candles.map((c) => (c.high + c.low + c.close) / 3);
  let sum = 0;
  for (let i = 0; i < p; i++) sum += tp[i]!;
  for (let i = p - 1; i < candles.length; i++) {
    if (i > p - 1) sum += tp[i]! - tp[i - p]!;
    const sma = sum / p;
    let meanDev = 0;
    for (let j = i - p + 1; j <= i; j++) meanDev += Math.abs(tp[j]! - sma);
    meanDev /= p;
    const value = meanDev === 0 ? 0 : (tp[i]! - sma) / (0.015 * meanDev);
    result.push({ time: candles[i]!.time, value });
  }
  return result;
}

// ── Money Flow Index ─────────────────────────────────────────
// MFI = 100 − 100/(1 + positive flow / negative flow) over n bars, where flow
// = typical price × volume. Returns [] when the feed has no volume.
export function mfi(candles: CandleData[], period = 14): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const p = validPeriod(period);
  if (p === null || candles.length < p + 1) return result;
  if (candles.every((c) => !c.volume)) return result;

  const flows = candles.map((c, i) => {
    const prev = i > 0 ? candles[i - 1]! : null;
    const tp = (c.high + c.low + c.close) / 3;
    const prevTp = prev ? (prev.high + prev.low + prev.close) / 3 : tp;
    const raw = tp * (c.volume ?? 0);
    return tp > prevTp ? { pos: raw, neg: 0 } : tp < prevTp ? { pos: 0, neg: raw } : { pos: 0, neg: 0 };
  });

  for (let i = p; i < candles.length; i++) {
    let pos = 0;
    let neg = 0;
    for (let j = i - p + 1; j <= i; j++) {
      pos += flows[j]!.pos;
      neg += flows[j]!.neg;
    }
    const value = neg === 0 ? 100 : 100 - 100 / (1 + pos / neg);
    result.push({ time: candles[i]!.time, value });
  }
  return result;
}

// ── Volume Moving Average ────────────────────────────────────
// SMA over the volume series (shares the volume histogram's scale). Points
// where volume is absent are skipped; the series is empty without volume.
export function volumeMa(candles: CandleData[], period = 20): IndicatorPoint[] {
  const result: IndicatorPoint[] = [];
  const p = validPeriod(period);
  if (p === null || candles.length < p) return result;
  if (candles.every((c) => !c.volume)) return result;

  let sum = 0;
  for (let i = 0; i < p; i++) sum += candles[i]!.volume ?? 0;
  result.push({ time: candles[p - 1]!.time, value: sum / p });
  for (let i = p; i < candles.length; i++) {
    sum += (candles[i]!.volume ?? 0) - (candles[i - p]!.volume ?? 0);
    result.push({ time: candles[i]!.time, value: sum / p });
  }
  return result;
}

// ── Indicator Registry (for UI) ──────────────────────────────
export type IndicatorType =
  | "SMA"
  | "EMA"
  | "WMA"
  | "HMA"
  | "RSI"
  | "MACD"
  | "BOLL"
  | "KELTNER"
  | "DONCHIAN"
  | "STOCH"
  | "STOCHRSI"
  | "ATR"
  | "VWAP"
  | "OBV"
  | "WPR"
  | "ROC"
  | "ADX"
  | "CCI"
  | "MFI"
  | "VOLMA";

export type IndicatorPane = "overlay" | "below";

export interface IndicatorParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

export interface IndicatorConfig {
  type: IndicatorType;
  label: string;
  pane: IndicatorPane;
  defaultParams: Record<string, number>;
  /** Input contract for auto-generated settings dialogs. */
  paramSpecs: IndicatorParamSpec[];
  color: string;
}

export const INDICATOR_REGISTRY: IndicatorConfig[] = [
  {
    type: "SMA",
    label: "Simple Moving Average",
    pane: "overlay",
    defaultParams: { period: 20 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 500, step: 1 }],
    color: "#26c6da",
  },
  {
    type: "EMA",
    label: "Exponential Moving Average",
    pane: "overlay",
    defaultParams: { period: 20 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 500, step: 1 }],
    color: "#e377c2",
  },
  {
    type: "WMA",
    label: "Weighted Moving Average",
    pane: "overlay",
    defaultParams: { period: 20 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 500, step: 1 }],
    color: "#80cbc4",
  },
  {
    type: "HMA",
    label: "Hull Moving Average",
    pane: "overlay",
    defaultParams: { period: 20 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 500, step: 1 }],
    color: "#4dd0e1",
  },
  {
    type: "RSI",
    label: "Relative Strength Index",
    pane: "below",
    defaultParams: { period: 14 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 200, step: 1 }],
    color: "#8884d8",
  },
  {
    type: "MACD",
    label: "MACD",
    pane: "below",
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    paramSpecs: [
      { key: "fast", label: "Fast length", min: 1, max: 200, step: 1 },
      { key: "slow", label: "Slow length", min: 1, max: 400, step: 1 },
      { key: "signal", label: "Signal smoothing", min: 1, max: 100, step: 1 },
    ],
    color: "#2962FF",
  },
  {
    type: "BOLL",
    label: "Bollinger Bands",
    pane: "overlay",
    defaultParams: { period: 20, stdDev: 2 },
    paramSpecs: [
      { key: "period", label: "Period", min: 2, max: 500, step: 1 },
      { key: "stdDev", label: "Std deviation", min: 0.5, max: 6, step: 0.1 },
    ],
    color: "#26a69a",
  },
  {
    type: "KELTNER",
    label: "Keltner Channels",
    pane: "overlay",
    defaultParams: { period: 20, multiplier: 2 },
    paramSpecs: [
      { key: "period", label: "Period", min: 2, max: 500, step: 1 },
      { key: "multiplier", label: "ATR multiplier", min: 0.5, max: 6, step: 0.1 },
    ],
    color: "#ba68c8",
  },
  {
    type: "DONCHIAN",
    label: "Donchian Channels",
    pane: "overlay",
    defaultParams: { period: 20 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 500, step: 1 }],
    color: "#ffb74d",
  },
  {
    type: "ATR",
    label: "Average True Range",
    pane: "below",
    defaultParams: { period: 14 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 200, step: 1 }],
    color: "#ff7043",
  },
  {
    type: "STOCH",
    label: "Stochastic Oscillator",
    pane: "below",
    defaultParams: { kPeriod: 14, dPeriod: 3 },
    paramSpecs: [
      { key: "kPeriod", label: "%K length", min: 1, max: 200, step: 1 },
      { key: "dPeriod", label: "%D smoothing", min: 1, max: 100, step: 1 },
    ],
    color: "#ab47bc",
  },
  {
    type: "STOCHRSI",
    label: "Stochastic RSI",
    pane: "below",
    defaultParams: { rsiPeriod: 14, stochPeriod: 14, dPeriod: 3 },
    paramSpecs: [
      { key: "rsiPeriod", label: "RSI length", min: 2, max: 200, step: 1 },
      { key: "stochPeriod", label: "Stochastic length", min: 2, max: 200, step: 1 },
      { key: "dPeriod", label: "%D smoothing", min: 1, max: 100, step: 1 },
    ],
    color: "#f06292",
  },
  {
    type: "VWAP",
    label: "Volume Weighted Avg Price",
    pane: "overlay",
    defaultParams: {},
    paramSpecs: [],
    color: "#2962FF",
  },
  {
    type: "OBV",
    label: "On-Balance Volume",
    pane: "below",
    defaultParams: {},
    paramSpecs: [],
    color: "#a1887f",
  },
  {
    type: "WPR",
    label: "Williams %R",
    pane: "below",
    defaultParams: { period: 14 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 200, step: 1 }],
    color: "#9575cd",
  },
  {
    type: "ROC",
    label: "Rate of Change",
    pane: "below",
    defaultParams: { period: 9 },
    paramSpecs: [{ key: "period", label: "Period", min: 1, max: 200, step: 1 }],
    color: "#4db6ac",
  },
  {
    type: "ADX",
    label: "ADX / DMI",
    pane: "below",
    defaultParams: { period: 14 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 100, step: 1 }],
    color: "#ce93d8",
  },
  {
    type: "CCI",
    label: "Commodity Channel Index",
    pane: "below",
    defaultParams: { period: 20 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 200, step: 1 }],
    color: "#81c784",
  },
  {
    type: "MFI",
    label: "Money Flow Index",
    pane: "below",
    defaultParams: { period: 14 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 200, step: 1 }],
    color: "#64b5f6",
  },
  {
    type: "VOLMA",
    label: "Volume MA",
    pane: "below",
    defaultParams: { period: 20 },
    paramSpecs: [{ key: "period", label: "Period", min: 2, max: 500, step: 1 }],
    color: "#b0bec5",
  },
];

/** Default params for a registry type (fresh copy — instances own theirs). */
export function defaultParamsFor(type: IndicatorType): Record<string, number> {
  const cfg = INDICATOR_REGISTRY.find((r) => r.type === type);
  return cfg ? { ...cfg.defaultParams } : {};
}
