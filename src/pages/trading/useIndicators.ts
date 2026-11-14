import { useEffect, useRef } from "react";
import type {
  CandlestickData,
  HistogramData,
  HistogramSeriesPartialOptions,
  IChartApi,
  ISeriesApi,
  LineData,
  LineSeriesPartialOptions,
  Time,
  SeriesType,
} from "lightweight-charts";
import { LineStyle } from "lightweight-charts";
import {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  stochastic,
  vwap,
  wma,
  hma,
  keltnerChannels,
  donchianChannels,
  stochRsi,
  obv,
  williamsR,
  roc,
} from "../../lib/indicators.ts";
import { effectiveColor, seriesKey, type IndicatorInstance } from "../../lib/indicator-instances.ts";
import { toIndicatorCandles } from "./utils.ts";
import { CHART_COLORS } from "./constants.ts";

/**
 * Paints the active indicators onto the chart (feature 6: instance-based).
 *
 * Each instance owns its series under `<id>:<sub>` keys, so two instances of
 * the same type never collide and param/style edits touch only their own
 * series. Series are REUSED, not recreated (audit #8/#34): the maps persist
 * and only `setData` re-runs; series are removed when their instance is
 * removed, and recreated only when the chart instance itself is (epoch bump).
 * Visibility is applied via applyOptions (no data churn).
 */
export function useIndicators(
  chartRef: React.RefObject<IChartApi | null>,
  candleSeriesRef: React.RefObject<ISeriesApi<SeriesType> | null>,
  chartData: CandlestickData<Time>[],
  instances: IndicatorInstance[],
  isDark: boolean,
  chartEpoch = 0,
): void {
  const lineSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const histSeriesRef = useRef<Map<string, ISeriesApi<"Histogram">>>(new Map());
  const epochRef = useRef(chartEpoch);
  const colors = isDark ? CHART_COLORS.dark : CHART_COLORS.light;

  useEffect(() => {
    if (!chartRef.current || !candleSeriesRef.current || chartData.length === 0) return;
    const chart = chartRef.current;

    // The chart instance was (re)created: series attached to the dead chart
    // are gone — drop the stale handles without removeSeries (their chart no
    // longer exists; calling removeSeries on it would throw).
    if (epochRef.current !== chartEpoch) {
      lineSeriesRef.current.clear();
      histSeriesRef.current.clear();
      epochRef.current = chartEpoch;
    }

    const indCandles = toIndicatorCandles(chartData);
    const desiredLines = new Set<string>();
    const desiredHists = new Set<string>();

    const line = (key: string, opts: LineSeriesPartialOptions): ISeriesApi<"Line"> => {
      desiredLines.add(key);
      let s = lineSeriesRef.current.get(key);
      if (!s) {
        s = chart.addLineSeries(opts);
        lineSeriesRef.current.set(key, s);
      } else {
        // Style may have changed on the instance (settings dialog) — apply in
        // place; applies are cheap and idempotent.
        s.applyOptions(opts);
      }
      return s;
    };
    const histogram = (
      key: string,
      opts: HistogramSeriesPartialOptions = {},
    ): ISeriesApi<"Histogram"> => {
      desiredHists.add(key);
      let s = histSeriesRef.current.get(key);
      if (!s) {
        s = chart.addHistogramSeries(opts);
        histSeriesRef.current.set(key, s);
      } else {
        s.applyOptions(opts);
      }
      return s;
    };
    const setLine = (key: string, opts: LineSeriesPartialOptions, data: LineData<Time>[]) => {
      line(key, opts).setData(data);
    };
    const setHist = (
      key: string,
      opts: HistogramSeriesPartialOptions,
      data: HistogramData<Time>[],
    ) => {
      histogram(key, opts).setData(data);
    };

    for (const inst of instances) {
      if (!inst.visible) continue; // eye toggle — series stays out until re-shown
      const color = effectiveColor(inst);
      switch (inst.type) {
        case "SMA": {
          const data = sma(indCandles, inst.params.period ?? 20);
          setLine(
            seriesKey(inst, "SMA"),
            { color, lineWidth: 1, priceScaleId: "right" },
            data.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "EMA": {
          const data = ema(indCandles, inst.params.period ?? 20);
          setLine(
            seriesKey(inst, "EMA"),
            { color, lineWidth: 1, priceScaleId: "right" },
            data.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "RSI": {
          const data = rsi(indCandles, inst.params.period ?? 14);
          setLine(
            seriesKey(inst, "RSI"),
            { color, lineWidth: 1, priceScaleId: "rsi" },
            data.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          setLine(
            seriesKey(inst, "RSI-70"),
            { color: "#555", lineWidth: 1, lineStyle: LineStyle.Dashed, priceScaleId: "rsi" },
            data.map((p) => ({ time: p.time as Time, value: 70 })),
          );
          setLine(
            seriesKey(inst, "RSI-30"),
            { color: "#555", lineWidth: 1, lineStyle: LineStyle.Dashed, priceScaleId: "rsi" },
            data.map((p) => ({ time: p.time as Time, value: 30 })),
          );
          break;
        }
        case "MACD": {
          const data = macd(
            indCandles,
            inst.params.fast ?? 12,
            inst.params.slow ?? 26,
            inst.params.signal ?? 9,
          );
          setLine(
            seriesKey(inst, "MACD-line"),
            { color, lineWidth: 1, priceScaleId: "macd" },
            data.macd.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          setLine(
            seriesKey(inst, "MACD-signal"),
            { color: "#ff9800", lineWidth: 1, priceScaleId: "macd" },
            data.signal.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          // Histogram colours are baked into the data; re-setData picks up the
          // current palette when the theme flips.
          setHist(
            seriesKey(inst, "MACD-hist"),
            { priceScaleId: "macd" },
            data.histogram.map((p) => ({
              time: p.time as Time,
              value: p.value,
              color: p.value >= 0 ? colors.up + "99" : colors.down + "99",
            })),
          );
          break;
        }
        case "BOLL": {
          const data = bollingerBands(
            indCandles,
            inst.params.period ?? 20,
            inst.params.stdDev ?? 2,
          );
          setLine(
            seriesKey(inst, "BOLL-upper"),
            { color: color + "80", lineWidth: 1, priceScaleId: "right" },
            data.upper.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          setLine(
            seriesKey(inst, "BOLL-mid"),
            { color, lineWidth: 1, priceScaleId: "right" },
            data.middle.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          setLine(
            seriesKey(inst, "BOLL-lower"),
            { color: color + "80", lineWidth: 1, priceScaleId: "right" },
            data.lower.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "ATR": {
          const data = atr(indCandles, inst.params.period ?? 14);
          setLine(
            seriesKey(inst, "ATR"),
            { color, lineWidth: 1, priceScaleId: "atr" },
            data.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "STOCH": {
          const data = stochastic(
            indCandles,
            inst.params.kPeriod ?? 14,
            inst.params.dPeriod ?? 3,
          );
          setLine(
            seriesKey(inst, "STOCH-K"),
            { color: "#ab47bc", lineWidth: 1, priceScaleId: "stoch" },
            data.k.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          setLine(
            seriesKey(inst, "STOCH-D"),
            { color: "#ff7043", lineWidth: 1, priceScaleId: "stoch" },
            data.d.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "VWAP": {
          const data = vwap(indCandles);
          setLine(
            seriesKey(inst, "VWAP"),
            { color, lineWidth: 2, lineStyle: LineStyle.Dashed, priceScaleId: "right" },
            data.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "WMA": {
          const data = wma(indCandles, inst.params.period ?? 20);
          setLine(
            seriesKey(inst, "WMA"),
            { color, lineWidth: 1, priceScaleId: "right" },
            data.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "HMA": {
          const data = hma(indCandles, inst.params.period ?? 20);
          setLine(
            seriesKey(inst, "HMA"),
            { color, lineWidth: 2, priceScaleId: "right" },
            data.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "KELTNER": {
          const data = keltnerChannels(
            indCandles,
            inst.params.period ?? 20,
            inst.params.multiplier ?? 2,
          );
          setLine(
            seriesKey(inst, "KC-upper"),
            { color: color + "80", lineWidth: 1, priceScaleId: "right" },
            data.upper.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          setLine(
            seriesKey(inst, "KC-mid"),
            { color, lineWidth: 1, priceScaleId: "right" },
            data.middle.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          setLine(
            seriesKey(inst, "KC-lower"),
            { color: color + "80", lineWidth: 1, priceScaleId: "right" },
            data.lower.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "DONCHIAN": {
          const data = donchianChannels(indCandles, inst.params.period ?? 20);
          setLine(
            seriesKey(inst, "DC-upper"),
            { color, lineWidth: 1, priceScaleId: "right" },
            data.upper.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          setLine(
            seriesKey(inst, "DC-mid"),
            { color: color + "80", lineWidth: 1, lineStyle: LineStyle.Dashed, priceScaleId: "right" },
            data.middle.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          setLine(
            seriesKey(inst, "DC-lower"),
            { color, lineWidth: 1, priceScaleId: "right" },
            data.lower.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "STOCHRSI": {
          const data = stochRsi(
            indCandles,
            inst.params.rsiPeriod ?? 14,
            inst.params.stochPeriod ?? 14,
            inst.params.dPeriod ?? 3,
          );
          setLine(
            seriesKey(inst, "SRSI-K"),
            { color, lineWidth: 1, priceScaleId: "stochrsi" },
            data.k.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          setLine(
            seriesKey(inst, "SRSI-D"),
            { color: "#ff9800", lineWidth: 1, priceScaleId: "stochrsi" },
            data.d.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "OBV": {
          const data = obv(indCandles);
          setLine(
            seriesKey(inst, "OBV"),
            { color, lineWidth: 1, priceScaleId: "obv" },
            data.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "WPR": {
          const data = williamsR(indCandles, inst.params.period ?? 14);
          setLine(
            seriesKey(inst, "WPR"),
            { color, lineWidth: 1, priceScaleId: "wpr" },
            data.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
        case "ROC": {
          const data = roc(indCandles, inst.params.period ?? 9);
          setLine(
            seriesKey(inst, "ROC"),
            { color, lineWidth: 1, priceScaleId: "roc" },
            data.map((p) => ({ time: p.time as Time, value: p.value })),
          );
          break;
        }
      }
    }

    // Remove series whose instance disappeared (or had a sub-series dropped).
    for (const [key, series] of lineSeriesRef.current) {
      if (desiredLines.has(key)) continue;
      try {
        chart.removeSeries(series);
      } catch {
        /* already gone */
      }
      lineSeriesRef.current.delete(key);
    }
    for (const [key, series] of histSeriesRef.current) {
      if (desiredHists.has(key)) continue;
      try {
        chart.removeSeries(series);
      } catch {
        /* already gone */
      }
      histSeriesRef.current.delete(key);
    }
    // chartRef/candleSeriesRef are stable refs; colors derived from isDark dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances, chartData, isDark, chartEpoch]);
}
