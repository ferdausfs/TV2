// Chart scale footer (feature 4): TradingView-style price-scale controls —
// Auto / Log / Percent toggles, visible-range buttons (1D…All) and a
// go-to-date popover, pinned inside the chart host (bottom-right; horizontally
// scrollable on mobile). Styled with theme tokens only (DESIGN.TV2.md).
import { useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { CalendarDays, X } from "lucide-react";
import type { IChartApi, ISeriesApi, SeriesType, Time } from "lightweight-charts";
import { updateChartPreferences } from "../../hooks/useChartPreferences.ts";

/** Approximate span of each range button, in seconds. */
const RANGE_SPANS: Record<string, number> = {
  "1D": 86_400,
  "5D": 5 * 86_400,
  "1M": 30 * 86_400,
  "3M": 91 * 86_400,
  "6M": 182 * 86_400,
  "1Y": 365 * 86_400,
  "5Y": 5 * 365 * 86_400,
};

interface Props {
  chartRef: RefObject<IChartApi | null>;
  seriesRef: RefObject<ISeriesApi<SeriesType> | null>;
  mode: "normal" | "log" | "percent";
  auto: boolean;
}

export function ChartScaleFooter({ chartRef, seriesRef, mode, auto }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [date, setDate] = useState("");

  const jumpTo = (spanSec: number | null) => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;
    if (spanSec == null) {
      chart.timeScale().fitContent();
      return;
    }
    const data = series.data();
    const last = data[data.length - 1];
    if (!last) return;
    const lastSec = last.time as number;
    // YTD anchors on Jan 1 UTC of the current year; others step back from the
    // newest loaded bar (calendar-approximate — assumption in AGENT_LOG).
    let fromSec: number;
    if (spanSec < 0) {
      // YTD — Jan 1 UTC of the current year.
      fromSec = Date.UTC(new Date(lastSec * 1000).getUTCFullYear(), 0, 1) / 1000;
    } else {
      fromSec = lastSec - spanSec;
    }
    try {
      chart.timeScale().setVisibleRange({ from: fromSec as Time, to: (lastSec + 60) as Time });
    } catch {
      // Out-of-window range on some engines — fall back to fitting.
      chart.timeScale().fitContent();
    }
  };

  const goTo = () => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !date) return;
    const targetSec = Date.parse(`${date}T00:00:00Z`) / 1000;
    if (!Number.isFinite(targetSec)) return;
    const data = series.data();
    // Binary-search the first bar at/after the target date.
    let lo = 0;
    let hi = data.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const t = data[mid]!.time as number;
      if (t >= targetSec) {
        idx = mid;
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }
    if (idx === -1) {
      // Before all loaded data — jump to the oldest loaded window; the
      // left-edge history loader fills older bars as the user scrolls.
      chart.timeScale().fitContent();
    } else {
      chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, idx - 3), to: idx + 25 });
    }
    setPickerOpen(false);
  };

  return (
    <div className="absolute bottom-1 right-1 z-20 max-w-[calc(100%-8px)]">
      {pickerOpen && (
        <div className="absolute bottom-9 right-0 z-30 flex items-center gap-1.5 rounded-lg border border-border bg-card p-2 shadow-lg">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Go to date"
            className="bg-secondary text-foreground text-xs rounded-md px-2 py-1.5 border border-border"
          />
          <button
            type="button"
            onClick={goTo}
            className="px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold active:scale-[0.98]"
          >
            Go
          </button>
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            aria-label="Close date picker"
            className="p-1 rounded-md text-muted-foreground active:bg-secondary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background/85 backdrop-blur px-1 py-0.5 overflow-x-auto no-scrollbar shadow-sm">
        <button
          type="button"
          onClick={() => updateChartPreferences({ priceScaleAuto: !auto })}
          title="Auto scale"
          aria-pressed={auto}
          className={cn(
            "px-1.5 py-1 rounded-md text-[10px] font-semibold shrink-0 transition",
            auto ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Auto
        </button>
        <button
          type="button"
          onClick={() => updateChartPreferences({ priceScaleMode: mode === "log" ? "normal" : "log" })}
          title="Logarithmic scale"
          aria-pressed={mode === "log"}
          className={cn(
            "px-1.5 py-1 rounded-md text-[10px] font-semibold shrink-0 transition",
            mode === "log"
              ? "text-foreground bg-secondary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Log
        </button>
        <button
          type="button"
          onClick={() =>
            updateChartPreferences({ priceScaleMode: mode === "percent" ? "normal" : "percent" })
          }
          title="Percent scale"
          aria-pressed={mode === "percent"}
          className={cn(
            "px-1.5 py-1 rounded-md text-[10px] font-semibold shrink-0 transition",
            mode === "percent"
              ? "text-foreground bg-secondary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          %
        </button>
        <span className="w-px h-4 bg-border shrink-0 mx-0.5" />
        {Object.keys(RANGE_SPANS).map((label) => (
          <button
            key={label}
            type="button"
            onClick={() => jumpTo(RANGE_SPANS[label] ?? null)}
            title={`Zoom to ${label}`}
            className="px-1.5 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground shrink-0 transition"
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => jumpTo(-1)}
          title="Zoom to year to date"
          className="px-1.5 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground shrink-0 transition"
        >
          YTD
        </button>
        <button
          type="button"
          onClick={() => jumpTo(null)}
          title="Zoom to all data"
          className="px-1.5 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground shrink-0 transition"
        >
          All
        </button>
        <span className="w-px h-4 bg-border shrink-0 mx-0.5" />
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          title="Go to date"
          aria-label="Go to date"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground shrink-0 transition"
        >
          <CalendarDays className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
