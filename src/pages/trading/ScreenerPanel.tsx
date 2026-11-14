/**
 * ─── Market screener (feature 13) ────────────────────────────────
 * Client-computed table over every active symbol: live mid price, session
 * change %, spread, and a day-range position — all derived from the shared
 * tick stream at 1Hz (no per-tick renders, no extra REST sweep).
 *
 * Rows are VIRTUALIZED (fixed-height windowing) per the audit's requirement:
 * the table must not render hundreds of rows at once.
 *
 * Theme tokens only; no adapter or schema change.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { formatNumber, cn } from "../../lib/utils.ts";
import type { Symbol } from "../../services/schemas.ts";

type Ticks = Record<string, { bid: number; ask: number; timestamp: number }>;

export interface ScreenerPanelProps {
  symbols: Symbol[];
  ticks: Ticks;
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
}

interface ScreenerRow {
  name: string;
  category: string;
  price: number;
  changePct: number | null;
  spreadBps: number | null;
  /** 0..100 position of the mid within the session low..high (null until a range exists). */
  rangePos: number | null;
}

type SortKey = "name" | "price" | "changePct" | "spreadBps";
type SortDir = "asc" | "desc";

const ROW_HEIGHT = 44;
const OVERSCAN = 6;

/**
 * Session stats sampler: per symbol, the first mid seen is the change
 * reference; min/max accumulate into the session range (same first-mid
 * rule as the watchlist — no server session anchor exists).
 */
function useSessionStats(ticks: Ticks) {
  const refsRef = useRef<Map<string, { ref: number; low: number; high: number }>>(new Map());
  const [snapshot, setSnapshot] = useState<Map<string, { ref: number; low: number; high: number }>>(
    new Map(),
  );

  useEffect(() => {
    const sample = () => {
      let dirty = false;
      for (const [symbol, t] of Object.entries(ticks)) {
        const mid = (t.bid + t.ask) / 2;
        if (!Number.isFinite(mid) || mid <= 0) continue;
        const s = refsRef.current.get(symbol);
        if (!s) {
          const fresh = { ref: mid, low: mid, high: mid };
          refsRef.current.set(symbol, fresh);
          dirty = true;
          continue;
        }
        if (mid < s.low) {
          s.low = mid;
          dirty = true;
        }
        if (mid > s.high) {
          s.high = mid;
          dirty = true;
        }
      }
      if (dirty) setSnapshot(new Map(refsRef.current));
    };
    sample();
    const id = setInterval(sample, 1000);
    return () => clearInterval(id);
  }, [ticks]);

  return snapshot;
}

export function ScreenerPanel({ symbols, ticks, selectedSymbol, onSelect }: ScreenerPanelProps) {
  const stats = useSessionStats(ticks);
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // 1Hz recomputed rows (snapshot identity changes only when a stat moved).
  const rows = useMemo<ScreenerRow[]>(() => {
    const out: ScreenerRow[] = [];
    for (const s of symbols) {
      if (s.isActive === false) continue;
      const t = ticks[s.name];
      const st = stats.get(s.name);
      const price = t ? (t.bid + t.ask) / 2 : NaN;
      if (!Number.isFinite(price)) continue;
      const changePct = st && st.ref > 0 ? ((price - st.ref) / st.ref) * 100 : null;
      const spreadBps = t && t.bid > 0 ? ((t.ask - t.bid) / t.bid) * 10_000 : null;
      const range =
        st && st.high > st.low ? ((price - st.low) / (st.high - st.low)) * 100 : null;
      out.push({
        name: s.name,
        category: s.category,
        price,
        changePct,
        spreadBps,
        rangePos: range,
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return out.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      const av = a[sortKey];
      const bv = b[sortKey];
      const an = av == null ? -Infinity : av;
      const bn = bv == null ? -Infinity : bv;
      return (an - bn) * dir || a.name.localeCompare(b.name);
    });
  }, [symbols, ticks, stats, sortKey, sortDir]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.category.toLowerCase().includes(q),
    );
  }, [rows, filter]);

  // ── Windowing state ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(400);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportH / ROW_HEIGHT) + OVERSCAN * 2;
  const windowRows = filtered.slice(first, first + visibleCount);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? (
      <ArrowUpDown className="h-3 w-3 opacity-40" />
    ) : sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-secondary">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Screener
        </h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            placeholder="Filter symbol or category…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter screener rows"
            className="w-full text-xs pl-7"
          />
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_64px_56px] gap-1 px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground bg-card">
        {(
          [
            ["name", "Symbol"],
            ["price", "Price"],
            ["changePct", "Chg%"],
            ["spreadBps", "Sprd"],
          ] as Array<[SortKey, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleSort(key)}
            className={cn(
              "flex items-center gap-0.5 text-left font-semibold hover:text-foreground",
              sortKey === key && "text-foreground",
            )}
          >
            {label}
            <SortIcon col={key} />
          </button>
        ))}
      </div>

      {/* Virtualized body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div style={{ height: filtered.length * ROW_HEIGHT, position: "relative" }}>
          {windowRows.map((r, i) => {
            const idx = first + i;
            const up = (r.changePct ?? 0) >= 0;
            return (
              <button
                key={r.name}
                type="button"
                onClick={() => onSelect(r.name)}
                style={{ position: "absolute", top: idx * ROW_HEIGHT, height: ROW_HEIGHT }}
                className={cn(
                  "w-full grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_64px_56px] gap-1 items-center px-3 text-xs border-b border-border/30 hover:bg-secondary text-left",
                  r.name === selectedSymbol && "bg-secondary",
                )}
              >
                <span className="min-w-0">
                  <span className="block font-semibold truncate">{r.name}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {r.category}
                  </span>
                </span>
                <span className="font-mono tabular-nums">
                  {formatNumber(r.price, r.price >= 100 ? 2 : 5)}
                </span>
                <span
                  className={cn(
                    "font-mono text-[11px] font-semibold tabular-nums",
                    r.changePct == null
                      ? "text-muted-foreground"
                      : up
                        ? "text-buy"
                        : "text-sell",
                  )}
                >
                  {r.changePct == null
                    ? "--"
                    : `${up ? "+" : ""}${r.changePct.toFixed(2)}%`}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {r.spreadBps == null ? "--" : r.spreadBps.toFixed(1)}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-4 text-xs text-muted-foreground text-center">
              No symbols match the filter.
            </div>
          )}
        </div>
      </div>
      <div className="px-3 py-1 border-t border-border text-[10px] text-muted-foreground">
        {filtered.length} symbols · live
      </div>
    </div>
  );
}
