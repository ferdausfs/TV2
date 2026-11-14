// Chart export utilities (feature 10): screenshot PNG, fullscreen toggle, and
// a JSON export/import of the chart configuration. All client-side.
import type { IChartApi } from "lightweight-charts";
import { getChartPreferencesFromStorage, updateChartPreferences, TEMPLATE_PREF_KEYS } from "../hooks/useChartPreferences.ts";
import { sanitizeInstances, type IndicatorInstance } from "./indicator-instances.ts";
import type { DrawingLine } from "../pages/trading/constants.ts";
import { toast } from "../services/toast.ts";
import { api } from "../services/api.ts";

/** Trigger a browser download for a blob under the given filename. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

/**
 * Screenshot the chart canvas: the chart renders to its own canvas (DPR-aware),
 * we stamp a plain-text legend on top (overlays are DOM, not canvas, so they
 * need manual compositing) and download the PNG.
 */
export function screenshotChart(
  chart: IChartApi,
  symbol: string,
  timeframe: string,
): void {
  const canvas = chart.takeScreenshot();
  const stamped = document.createElement("canvas");
  stamped.width = canvas.width;
  stamped.height = canvas.height;
  const ctx = stamped.getContext("2d");
  if (!ctx) {
    toast.error("Screenshot", "Canvas unavailable");
    return;
  }
  ctx.drawImage(canvas, 0, 0);
  // Legend stamp — top-left, matching the on-screen header's position/size.
  const fontSize = Math.max(12, Math.round(11 * (canvas.width / canvas.getBoundingClientRect?.().width || 1)) );
  ctx.font = `bold ${fontSize + 2}px ui-monospace, monospace`;
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--foreground")
    .trim() || "#d1d4dc";
  ctx.textBaseline = "top";
  ctx.fillText(`${symbol} · ${timeframe}`, 12, 10);
  stamped.toBlob((blob) => {
    if (!blob) {
      toast.error("Screenshot", "Encode failed");
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `TV2_${symbol.replace(/[^A-Za-z0-9-]/g, "_")}_${timeframe}_${date}.png`);
    toast.success("Screenshot", "PNG downloaded");
  }, "image/png");
}

/** Request fullscreen on the chart host (with a webkit fallback). */
export function enterFullscreen(el: HTMLElement): void {
  const anyEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  if (el.requestFullscreen) void el.requestFullscreen();
  else if (anyEl.webkitRequestFullscreen) void anyEl.webkitRequestFullscreen();
}

export function exitFullscreen(): void {
  const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
  if (document.fullscreenElement) void document.exitFullscreen();
  else if (doc.webkitExitFullscreen) void doc.webkitExitFullscreen();
}

// ── JSON export / import ─────────────────────────────────────

interface ChartConfigFile {
  app: "TV2";
  version: 1;
  exportedAt: string;
  symbol: string;
  prefs: Record<string, string | boolean>;
  indicatorInstances: IndicatorInstance[];
  drawings: DrawingLine[];
}

/** Export the current chart configuration (prefs + indicators + drawings). */
export async function exportChartConfig(symbol: string, drawings: DrawingLine[]): Promise<void> {
  const prefs = getChartPreferencesFromStorage();
  const snapshot: Record<string, string | boolean> = {};
  for (const key of TEMPLATE_PREF_KEYS) snapshot[key] = prefs[key];
  const file: ChartConfigFile = {
    app: "TV2",
    version: 1,
    exportedAt: new Date().toISOString(),
    symbol,
    prefs: snapshot,
    indicatorInstances: prefs.indicatorInstances,
    drawings,
  };
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
  const date = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `TV2_config_${symbol.replace(/[^A-Za-z0-9-]/g, "_")}_${date}.json`);
  toast.success("Export", "Chart config downloaded");
}

/**
 * Import a chart-config JSON: validates shape, applies prefs + indicator
 * instances globally and replaces the current symbol's drawings.
 */
export async function importChartConfig(
  file: File,
  symbol: string,
  replaceDrawings: (list: DrawingLine[]) => void,
): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    toast.error("Import", "Not a valid JSON file");
    return;
  }
  const cfg = parsed as Partial<ChartConfigFile> | null;
  if (!cfg || cfg.app !== "TV2" || cfg.version !== 1 || typeof cfg.symbol !== "string") {
    toast.error("Import", "Unrecognized chart config file");
    return;
  }
  if (cfg.prefs && typeof cfg.prefs === "object") {
    updateChartPreferences(cfg.prefs as Record<string, string | boolean>);
  }
  if (Array.isArray(cfg.indicatorInstances)) {
    updateChartPreferences({ indicatorInstances: sanitizeInstances(cfg.indicatorInstances) });
  }
  if (Array.isArray(cfg.drawings)) {
    // Replace the current symbol's drawings via the existing API (save
    // expects a single drawing per call — clear then push each).
    try {
      await api.chartDrawings.clear(symbol);
      for (const d of cfg.drawings as DrawingLine[]) {
        await api.chartDrawings.save(symbol, d.createdTf ?? "1m", d);
      }
      replaceDrawings(cfg.drawings as DrawingLine[]);
    } catch {
      // Drawings may be unsupported for this adapter — prefs still applied.
    }
  }
  toast.success("Import", `Applied config from ${cfg.symbol}`);
}
