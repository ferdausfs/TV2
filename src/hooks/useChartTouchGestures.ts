import { useEffect, useRef, useState } from "react";

// ── Long-press crosshair + double-tap fit (chart gestures) ───

/**
 * Attach to the chart container: a 350ms touch-hold pins the crosshair under
 * the finger (moves with it, clears on release); a quick double-tap fits the
 * content. Returns props to spread on the container element.
 */
export function useChartTouchGestures(
  chartRef: React.RefObject<
    {
      setCrosshairPosition: (price: number, horizontalPosition: number, seriesApi: unknown) => void;
      clearCrosshairPosition: () => void;
      timeScale: () => {
        fitContent: () => void;
        scrollToRealTime: () => void;
      };
    } | null
  >,
  seriesRef: React.RefObject<unknown>,
) {
  const holdTimer = useRef<number | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    return () => {
      if (holdTimer.current != null) window.clearTimeout(holdTimer.current);
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !seriesRef.current) return;
    const x = touch.clientX;
    const y = touch.clientY;
    holdTimer.current = window.setTimeout(() => {
      const chart = chartRef.current;
      const series = seriesRef.current as {
        coordinateToPrice: (y: number) => number | null;
      } | null;
      if (!chart || !series) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const price = series.coordinateToPrice(y - rect.top);
      if (price == null || !Number.isFinite(price)) return;
      // The coordinate form needs the time axis position; pass the touch x.
      chart.setCrosshairPosition(price, x - rect.left, seriesRef.current);
      setActive(true);
      // Keep following the finger — listeners below in onTouchMove.
      const move = (ev: TouchEvent) => {
        const t = ev.touches[0];
        if (!t) return;
        const p = series.coordinateToPrice(t.clientY - rect.top);
        if (p != null && Number.isFinite(p)) {
          chart.setCrosshairPosition(p, t.clientX - rect.left, seriesRef.current);
        }
      };
      const end = () => {
        chart.clearCrosshairPosition();
        setActive(false);
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", end);
        window.removeEventListener("touchcancel", end);
      };
      window.addEventListener("touchmove", move, { passive: true });
      window.addEventListener("touchend", end);
      window.addEventListener("touchcancel", end);
    }, 350);

    // Double-tap fit: two taps within 300ms and ~30px.
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && now - last.time < 300 && Math.hypot(x - last.x, y - last.y) < 30) {
      lastTapRef.current = null;
      if (holdTimer.current != null) window.clearTimeout(holdTimer.current);
      const chart = chartRef.current;
      if (chart) {
        chart.timeScale().fitContent();
        chart.timeScale().scrollToRealTime();
      }
    } else {
      lastTapRef.current = { time: now, x, y };
    }
  };

  const onTouchEnd = () => {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  return {
    onTouchStart,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
    onContextMenu: (e: React.MouseEvent) => {
      // Long-press owns the context menu on the chart surface.
      if (active) e.preventDefault();
    },
  };
}
