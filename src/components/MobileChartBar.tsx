/**
 * ─── Mobile chart action bar (feature 22) ─────────────────────
 * TradingView-style bottom action bar for phones. It sits under the chart
 * (the chart keeps the whole screen above it) and carries the six controls
 * from the reference: symbol, timeframe, the Trade CTA, chart type,
 * indicators and the overflow menu.
 *
 * Every control opens a bottom sheet — mobile pickers are sheets, never
 * dropdowns (DESIGN.TV2.md §5). Styled with theme tokens only.
 */
import {
  ArrowLeftRight,
  Baseline,
  Bell,
  ChartArea,
  ChartBar,
  ChartCandlestick,
  ChartLine,
  Check,
  Columns2,
  EllipsisVertical,
  LayoutGrid,
  Moon,
  PenLine,
  Search,
  Square,
  SquarePlus,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { type ReactNode, useMemo, useState, useSyncExternalStore } from "react";
import { INDICATOR_REGISTRY, type IndicatorType } from "../lib/indicators.ts";
import { cn } from "../lib/utils.ts";
import { isDarkTheme, subscribeTheme, toggleTheme } from "../lib/theme.ts";
import { PriceAlertsPanelLive } from "./PriceAlertsPanel.tsx";
import { TIMEFRAMES, type Timeframe } from "../pages/trading/constants.ts";

export type ChartType = "candles" | "line" | "area" | "baseline" | "bars";

export interface MobileChartBarProps {
  symbol: string;
  symbols: Array<{
    id?: string;
    name: string;
    displayName?: string | null;
    category?: string;
    assetClass?: string;
  }>;
  onSymbolChange: (s: string) => void;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  activeIndicators: IndicatorType[];
  onToggleIndicator: (t: IndicatorType) => void;
  /** Opens the order-entry sheet. */
  onOpenTrade: () => void;
  /** Chart layout (single / dual / quad). */
  chartLayout: "single" | "dual" | "quad";
  onChartLayoutChange: (l: "single" | "dual" | "quad") => void;
  /** Drawings on the chart — enables "clear drawings" in the overflow menu. */
  hasDrawings: boolean;
  onClearDrawings: () => void;
}

type SheetId = "symbols" | "timeframes" | "chartType" | "indicators" | "more" | "alerts";

const CHART_TYPES: Array<{ key: ChartType; label: string; Icon: typeof ChartCandlestick }> = [
  { key: "candles", label: "Candles", Icon: ChartCandlestick },
  { key: "bars", label: "Bars", Icon: ChartBar },
  { key: "line", label: "Line", Icon: ChartLine },
  { key: "area", label: "Area", Icon: ChartArea },
  { key: "baseline", label: "Baseline", Icon: Baseline },
];

const LAYOUTS: Array<{ key: "single" | "dual" | "quad"; label: string; Icon: typeof Square }> = [
  { key: "single", label: "1 chart", Icon: Square },
  { key: "dual", label: "2 charts", Icon: Columns2 },
  { key: "quad", label: "4 charts", Icon: LayoutGrid },
];

/** Bottom sheet shell — drag handle, title, close button, scrim. */
function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="md:hidden fixed inset-0 z-[90] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 flex max-h-[75vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-2xl safe-area-bottom animate-slide-up">
        <div className="flex justify-center pt-1.5">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/40" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 pt-1">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
          {children}
        </div>
      </div>
    </div>
  );
}

export function MobileChartBar({
  symbol,
  symbols,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  activeIndicators,
  onToggleIndicator,
  onOpenTrade,
  chartLayout,
  onChartLayoutChange,
  hasDrawings,
  onClearDrawings,
}: MobileChartBarProps) {
  const [sheet, setSheet] = useState<SheetId | null>(null);
  const [symbolFilter, setSymbolFilter] = useState("");
  // Reactive theme — the overflow menu label flips the moment it changes.
  const isDark = useSyncExternalStore(subscribeTheme, isDarkTheme, () => true);

  const filteredSymbols = useMemo(
    () =>
      symbols.filter(
        (s) =>
          s.name.toLowerCase().includes(symbolFilter.toLowerCase()) ||
          (s.category || "").toLowerCase().includes(symbolFilter.toLowerCase()),
      ),
    [symbols, symbolFilter],
  );

  const close = () => {
    setSheet(null);
    setSymbolFilter("");
  };

  return (
    <>
      {/* ── The bar ──────────────────────────────────────────── */}
      <nav
        aria-label="Chart actions"
        className="md:hidden flex shrink-0 items-center gap-1 border-t border-border bg-background px-2 py-1.5 safe-area-bottom"
      >
        {/* Symbol + timeframe (left) */}
        <button
          type="button"
          onClick={() => setSheet("symbols")}
          aria-label={`Symbol: ${symbol}. Change symbol`}
          className="max-w-[38vw] truncate rounded-md px-1.5 py-2 text-[15px] font-bold tracking-tight text-foreground active:bg-secondary"
        >
          {symbol}
        </button>
        <button
          type="button"
          onClick={() => setSheet("timeframes")}
          aria-label={`Timeframe: ${timeframe}. Change timeframe`}
          className="rounded-md px-1.5 py-2 text-[15px] font-bold tracking-tight text-foreground active:bg-secondary"
        >
          {timeframe}
        </button>

        {/* Trade CTA (center) */}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={onOpenTrade}
            className="flex h-10 items-center gap-1.5 rounded-full bg-cta px-4 text-[15px] font-bold text-cta-foreground active:scale-[0.97] transition-transform"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Trade
          </button>
        </div>

        {/* Chart type · indicators · overflow (right) */}
        <button
          type="button"
          onClick={() => setSheet("chartType")}
          aria-label="Chart type"
          className="rounded-md p-2 text-foreground active:bg-secondary"
        >
          <ChartCandlestick className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setSheet("indicators")}
          aria-label={`Indicators${activeIndicators.length ? ` (${activeIndicators.length} active)` : ""}`}
          className="rounded-md p-2 text-foreground active:bg-secondary"
        >
          <SquarePlus className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setSheet("more")}
          aria-label="More actions"
          className="rounded-md p-2 text-foreground active:bg-secondary"
        >
          <EllipsisVertical className="h-5 w-5" />
        </button>
      </nav>

      {/* ── Sheets ───────────────────────────────────────────── */}
      {sheet === "symbols" && (
        <Sheet title="Symbols" onClose={close}>
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-secondary px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              placeholder="Search symbols..."
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          {filteredSymbols.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No symbols match &ldquo;{symbolFilter}&rdquo;
            </p>
          ) : (
            filteredSymbols.map((s) => (
              <button
                key={s.id || s.name}
                type="button"
                onClick={() => {
                  onSymbolChange(s.name);
                  close();
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm active:bg-secondary",
                  s.name === symbol && "bg-secondary",
                )}
              >
                <span className="flex flex-col">
                  <span className="font-semibold text-foreground">{s.name}</span>
                  {s.displayName && s.displayName !== s.name && (
                    <span className="text-xs text-muted-foreground">{s.displayName}</span>
                  )}
                </span>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {s.category || s.assetClass}
                </span>
              </button>
            ))
          )}
        </Sheet>
      )}

      {sheet === "timeframes" && (
        <Sheet title="Timeframe" onClose={close}>
          <div className="grid grid-cols-3 gap-2">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => {
                  onTimeframeChange(tf);
                  close();
                }}
                aria-pressed={tf === timeframe}
                className={cn(
                  "min-h-[44px] rounded-lg text-sm font-semibold transition-colors",
                  tf === timeframe
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground active:bg-muted",
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {sheet === "chartType" && (
        <Sheet title="Chart type" onClose={close}>
          {CHART_TYPES.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChartTypeChange(key);
                close();
              }}
              aria-pressed={key === chartType}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-secondary",
                key === chartType && "bg-secondary",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-foreground" />
              <span className="flex-1 font-medium text-foreground">{label}</span>
              {key === chartType && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </Sheet>
      )}

      {sheet === "indicators" && (
        <Sheet title="Indicators" onClose={close}>
          {INDICATOR_REGISTRY.map((ind) => {
            const active = activeIndicators.includes(ind.type);
            return (
              <button
                key={ind.type}
                type="button"
                onClick={() => onToggleIndicator(ind.type)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-secondary",
                  active && "bg-secondary",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: ind.color }}
                />
                <span className="flex-1 truncate font-medium text-foreground">{ind.label}</span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {ind.pane}
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </Sheet>
      )}

      {sheet === "more" && (
        <Sheet title="More" onClose={close}>
          {/* Theme */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-secondary"
          >
            {isDark ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
            <span className="flex-1 font-medium text-foreground">
              {isDark ? "Switch to light theme" : "Switch to dark theme"}
            </span>
          </button>

          {/* Chart layout */}
          <div className="px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chart layout
            </span>
            <div className="mt-2 flex gap-2">
              {LAYOUTS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChartLayoutChange(key)}
                  aria-pressed={key === chartLayout}
                  className={cn(
                    "flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors",
                    key === chartLayout
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground active:bg-muted",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Price alerts */}
          <button
            type="button"
            onClick={() => setSheet("alerts")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-secondary"
          >
            <Bell className="h-5 w-5 text-foreground" />
            <span className="flex-1 font-medium text-foreground">Price alerts</span>
          </button>

          {/* Clear drawings */}
          <button
            type="button"
            onClick={() => {
              onClearDrawings();
              close();
            }}
            disabled={!hasDrawings}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm active:bg-secondary disabled:opacity-40"
          >
            <Trash2 className="h-5 w-5 text-foreground" />
            <span className="flex-1 font-medium text-foreground">Clear drawings</span>
          </button>

          {/* Drawing tools hint (the rail lives on the chart itself) */}
          <div className="flex items-center gap-3 px-3 py-3 text-sm">
            <PenLine className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground">
              Drawing tools are on the chart&apos;s left rail
            </span>
          </div>
        </Sheet>
      )}

      {sheet === "alerts" && (
        <Sheet title={`Price alerts · ${symbol}`} onClose={close}>
          <PriceAlertsPanelLive symbol={symbol} />
        </Sheet>
      )}
    </>
  );
}
