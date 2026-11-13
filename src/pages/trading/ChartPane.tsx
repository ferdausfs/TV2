import { useMemo, useState } from "react";
import { useCandles } from "../../services/queries.ts";
import { useChartDrawings } from "../../hooks/useChartDrawings.ts";
import { useTradingStore } from "../../services/store.tsx";
import { TIMEFRAMES, type DrawingTool, type Timeframe } from "./constants.ts";
import { ChartPanel } from "./ChartPanel.tsx";
import { getPipDigits } from "./utils.ts";

/**
 * One pane of a multi-chart layout. Each pane owns its symbol + timeframe:
 * its own candle query (cached per symbol:timeframe) and its own drawings
 * (keyed per symbol by useChartDrawings). Live ticks/candles need no wiring
 * here — ChartPanel's internal store pump keys everything off this pane's
 * selectedSymbol/timeframe props, so any number of panes can stream
 * different symbols side by side without touching the main chart's context.
 *
 * Indicators and replay stay on the main pane (pane 0); panes are
 * view/annotate surfaces built for comparison.
 */
export function ChartPane({
  symbol,
  timeframe,
  symbols,
  isDark,
  onSymbolChange,
  onTimeframeChange,
}: {
  symbol: string;
  timeframe: Timeframe;
  /** Symbols offered in the pane's picker (the full symbol list). */
  symbols: Array<{ name: string }>;
  isDark: boolean;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (tf: Timeframe) => void;
}) {
  const { data: candles = [] } = useCandles(symbol, timeframe, 1000);
  const drawing = useChartDrawings(symbol, timeframe);
  const positions = useTradingStore((s) => s.positions);
  const orders = useTradingStore((s) => s.orders);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("none");

  const chartPositions = useMemo(
    () => positions.filter((p) => p.symbolName === symbol),
    [positions, symbol],
  );
  const chartOrders = useMemo(
    () => orders.filter((o) => o.symbolName === symbol),
    [orders, symbol],
  );

  return (
    <div className="flex flex-col w-full h-full min-w-0 min-h-0 bg-background">
      {/* Compact pane bar — symbol + timeframe pickers (DESIGN.md §5) */}
      <div className="flex items-center gap-1 px-1.5 py-1 border-b border-border bg-card shrink-0">
        <select
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value)}
          aria-label="Pane symbol"
          className="bg-secondary border border-border rounded px-1.5 py-1 text-[11px] font-bold text-foreground"
        >
          {symbols.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={timeframe}
          onChange={(e) => onTimeframeChange(e.target.value as Timeframe)}
          aria-label="Pane timeframe"
          className="bg-secondary border border-border rounded px-1 py-1 text-[11px] text-foreground"
        >
          {TIMEFRAMES.map((tf) => (
            <option key={tf} value={tf}>
              {tf}
            </option>
          ))}
        </select>
      </div>

      <div className="pane-host flex-1 min-h-0 relative">
        <ChartPanel
          candles={candles}
          selectedSymbol={symbol}
          timeframe={timeframe}
          isDark={isDark}
          activeIndicators={[]}
          drawingTool={drawingTool}
          drawings={drawing.drawings}
          onAddDrawing={drawing.addDrawing}
          onUpdateDrawing={drawing.updateDrawing}
          onRemoveDrawing={drawing.removeDrawing}
          onDrawingComplete={() => setDrawingTool("none")}
          onDrawingToolSelect={setDrawingTool}
          onUndoDrawing={drawing.undo}
          onRedoDrawing={drawing.redo}
          positions={chartPositions}
          orders={chartOrders}
          pipDigits={getPipDigits(undefined, symbol)}
          isReplaying={false}
        />
      </div>
    </div>
  );
}
