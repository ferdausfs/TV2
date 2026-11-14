// Indicator instance model (feature 6): an indicator on the chart is an
// *instance* — a registry type + its own params + style + visibility. This is
// the persistence + mutation layer; rendering lives in useIndicators.
import { INDICATOR_REGISTRY, defaultParamsFor, type IndicatorType } from "./indicators.ts";

export interface IndicatorInstance {
  /** Stable unique id (crypto.randomUUID) — series keys derive from it. */
  id: string;
  type: IndicatorType;
  /** Instance-owned params (validated against the registry's paramSpecs). */
  params: Record<string, number>;
  /** Style overrides; undefined fields inherit the registry color. */
  color?: string;
  /** Hide without destroying (eye toggle). */
  visible: boolean;
}

const VALID_TYPES = new Set<string>(INDICATOR_REGISTRY.map((r) => r.type));

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * Parse/repair arbitrary stored JSON into a valid instance list: unknown
 * types dropped, params clamped to the registry spec, missing fields
 * defaulted. Storage corruption must degrade to "fewer indicators", never
 * throw.
 */
export function sanitizeInstances(input: unknown): IndicatorInstance[] {
  if (!Array.isArray(input)) return [];
  const out: IndicatorInstance[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || r.id.length === 0) continue;
    if (typeof r.type !== "string" || !VALID_TYPES.has(r.type)) continue;
    const type = r.type as IndicatorType;
    const cfg = INDICATOR_REGISTRY.find((x) => x.type === type)!;
    const defaults = cfg.defaultParams;
    const storedParams = (r.params ?? {}) as Record<string, unknown>;
    const params: Record<string, number> = {};
    for (const spec of cfg.paramSpecs) {
      const fallback = defaults[spec.key] ?? spec.min;
      params[spec.key] = clampNumber(storedParams[spec.key], spec.min, spec.max, fallback);
    }
    out.push({
      id: r.id,
      type,
      params,
      color: typeof r.color === "string" && r.color.length > 0 ? r.color : undefined,
      visible: r.visible !== false,
    });
  }
  return out;
}

/** Parse/repair stored favorites (strings validated against the registry). */
export function sanitizeFavorites(input: unknown): IndicatorType[] {
  if (!Array.isArray(input)) return [];
  const out: IndicatorType[] = [];
  for (const raw of input) {
    if (typeof raw === "string" && VALID_TYPES.has(raw)) {
      out.push(raw as IndicatorType);
    }
  }
  return [...new Set(out)];
}

/** Fresh instance of a registry type with default params. */
export function makeInstance(type: IndicatorType): IndicatorInstance {
  return { id: crypto.randomUUID(), type, params: defaultParamsFor(type), visible: true };
}

/** Registry config lookup (undefined for unknown types — callers guard). */
export function configFor(type: IndicatorType) {
  return INDICATOR_REGISTRY.find((r) => r.type === type);
}

/** Effective color: instance override → registry color. */
export function effectiveColor(inst: IndicatorInstance): string {
  return inst.color ?? configFor(inst.type)?.color ?? "#2962FF";
}

/**
 * Series key for a sub-series of an instance: `<id>:<sub>` — unique per
 * instance so two SMAs with different periods never share a series.
 */
export function seriesKey(inst: IndicatorInstance, sub: string): string {
  return `${inst.id}:${sub}`;
}
