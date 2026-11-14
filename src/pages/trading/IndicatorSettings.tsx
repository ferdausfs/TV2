// Per-indicator legend rows + settings dialog (feature 6).
//
// Legend rows: one per instance under the OHLC header — colored dot, label,
// eye (visibility), gear (settings), ✕ (remove). Settings dialog: Inputs tab
// generated from the registry's paramSpecs, Style tab for color/width-ish
// overrides. Both re-enable pointer events (the legend wrapper is
// pointer-events-none for chart passthrough).
import { useState } from "react";
import { Eye, EyeOff, Settings2, X } from "lucide-react";
import type { IndicatorInstance } from "../../lib/indicator-instances.ts";
import { configFor, effectiveColor } from "../../lib/indicator-instances.ts";
import type { IndicatorParamSpec } from "../../lib/indicators.ts";
import { cn } from "../../lib/utils.ts";

export function IndicatorLegendRows({
  instances,
  onToggleVisible,
  onSettings,
  onRemove,
}: {
  instances: IndicatorInstance[];
  onToggleVisible: (id: string) => void;
  onSettings: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="absolute top-2 left-3 z-10 mt-[26px] space-y-0.5 select-none">
      {instances.map((inst) => {
        const cfg = configFor(inst.type);
        const color = effectiveColor(inst);
        return (
          <div
            key={inst.id}
            className="pointer-events-auto flex items-center gap-1.5 text-[11px] font-mono leading-none w-fit rounded bg-background/70 px-1 py-0.5"
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className={cn("font-medium", !inst.visible && "text-muted-foreground line-through")}>
              {cfg?.label ?? inst.type}
            </span>
            <button
              type="button"
              aria-label={inst.visible ? `Hide ${cfg?.label ?? inst.type}` : `Show ${cfg?.label ?? inst.type}`}
              onClick={() => onToggleVisible(inst.id)}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground"
            >
              {inst.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </button>
            <button
              type="button"
              aria-label={`Settings for ${cfg?.label ?? inst.type}`}
              onClick={() => onSettings(inst.id)}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label={`Remove ${cfg?.label ?? inst.type}`}
              onClick={() => onRemove(inst.id)}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Inputs + Style dialog for one indicator instance. */
export function IndicatorSettingsDialog({
  instance,
  onClose,
  onUpdate,
}: {
  instance: IndicatorInstance | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<IndicatorInstance>) => void;
}) {
  const [tab, setTab] = useState<"inputs" | "style">("inputs");
  if (!instance) return null;
  const cfg = configFor(instance.type);
  const color = effectiveColor(instance);

  const setParam = (key: string, raw: string, spec: { min: number; max: number }) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(spec.max, Math.max(spec.min, n));
    onUpdate(instance.id, { params: { ...instance.params, [key]: clamped } });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-label={`${cfg?.label ?? instance.type} settings`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xs rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs font-semibold truncate">{cfg?.label ?? instance.type}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="p-1 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex gap-1 px-3 pt-2">
          {(["inputs", "style"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium capitalize transition",
                tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-3 space-y-2.5">
          {tab === "inputs" ? (
            cfg && cfg.paramSpecs.length > 0 ? (
              cfg.paramSpecs.map((spec: IndicatorParamSpec) => (
                <label key={spec.key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">{spec.label}</span>
                  <input
                    type="number"
                    value={instance.params[spec.key] ?? cfg.defaultParams[spec.key] ?? spec.min}
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    onChange={(e) => setParam(spec.key, e.target.value, spec)}
                    className="w-20 bg-secondary rounded-md px-2 py-1 text-right outline-none focus:ring-1 focus:ring-ring"
                  />
                </label>
              ))
            ) : (
              <div className="text-xs text-muted-foreground py-2 text-center">
                No inputs for this indicator.
              </div>
            )
          ) : (
            <label className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">Line color</span>
              <span className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onUpdate(instance.id, { color: e.target.value })}
                  className="h-7 w-10 rounded cursor-pointer bg-transparent"
                  aria-label="Indicator color"
                />
                <button
                  type="button"
                  onClick={() => onUpdate(instance.id, { color: undefined })}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
