/**
 * ─── Mobile shell §5.4 completion (feature 11) ───────────────────
 * Bottom navigation, floating chart action row, drawing bottom-sheet,
 * long-press crosshair and double-tap auto-fit. Mobile-only — everything
 * here renders inside `md:hidden` containers and desktop is untouched.
 *
 * Styled with theme tokens only (DESIGN.TV2.md).
 */
import { Activity, Bell, ChartCandlestick, PenLine, ListOrdered, Redo2, Undo2, X } from "lucide-react";
import { cn } from "../lib/utils.ts";
import type { MobileTab } from "./MobileTradingPanel.tsx";
import type { DrawingTool } from "../pages/trading/constants.ts";

// ── Bottom navigation ────────────────────────────────────────

const NAV_ITEMS: Array<{ key: MobileTab | "chart"; label: string; icon: typeof ChartCandlestick }> = [
  { key: "chart", label: "Chart", icon: ChartCandlestick },
  { key: "positions", label: "Orders", icon: ListOrdered },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "order", label: "Trade", icon: Activity },
];

export function MobileBottomNav({
  active,
  sheetOpen,
  onChart,
  onOpenTab,
}: {
  /** Which tab the bottom-sheet is showing (only meaningful when open). */
  active: MobileTab;
  sheetOpen: boolean;
  /** Close the sheet and show just the chart. */
  onChart: () => void;
  /** Open the sheet on the given tab. */
  onOpenTab: (tab: MobileTab) => void;
}) {
  const current: MobileTab | "chart" = sheetOpen ? active : "chart";
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden shrink-0 flex border-t border-border bg-card safe-area-bottom"
    >
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const isActive = current === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isActive}
            onClick={() => (key === "chart" ? onChart() : onOpenTab(key as MobileTab))}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

// ── Floating chart action row ────────────────────────────────

export function MobileChartActions({
  drawingToolArmed,
  onIndicators,
  onDraw,
  onAlert,
}: {
  drawingToolArmed: boolean;
  onIndicators: () => void;
  onDraw: () => void;
  onAlert: () => void;
}) {
  // The drawing rail takes over while a tool is armed — hide the row.
  if (drawingToolArmed) return null;
  return (
    <div className="md:hidden absolute top-2 right-2 z-20 flex items-center gap-1 rounded-full border border-border bg-background/85 backdrop-blur px-1 py-0.5 shadow-sm">
      <button
        type="button"
        aria-label="Indicators"
        onClick={onIndicators}
        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground"
      >
        <Activity className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Draw"
        onClick={onDraw}
        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground"
      >
        <PenLine className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Add alert"
        onClick={onAlert}
        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground"
      >
        <Bell className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Drawing bottom-sheet ─────────────────────────────────────

export function MobileDrawSheet({
  tool,
  canUndo,
  canRedo,
  hasDrawings,
  onUndo,
  onRedo,
  onClear,
  onDone,
}: {
  tool: DrawingTool | null;
  canUndo: boolean;
  canRedo: boolean;
  hasDrawings: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDone: () => void;
}) {
  if (!tool || tool === "none") return null;
  return (
    <div className="md:hidden fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom,0px)+56px)] z-40 rounded-xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold capitalize">{tool} tool</span>
        <button
          type="button"
          onClick={onDone}
          aria-label="Done drawing"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo drawing"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-secondary text-xs font-medium disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo drawing"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-secondary text-xs font-medium disabled:opacity-40"
        >
          <Redo2 className="h-3.5 w-3.5" /> Redo
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasDrawings}
          className="ml-auto px-2.5 py-1.5 rounded-md bg-destructive/15 text-destructive text-xs font-semibold disabled:opacity-40"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
        >
          Done
        </button>
      </div>
    </div>
  );
}
