import { lazy, Suspense, useState, useCallback, useMemo, useContext, useEffect, useRef } from "react";
import { ListPlus, Star, X } from "lucide-react";
import { usePlaceOrder } from "../../services/queries.ts";
import { formatNumber, cn } from "../../lib/utils.ts";
import { toast } from "../../services/toast.ts";
import { safeStorage } from "../../lib/safe-storage.ts";
import { isHyperliquidMode } from "../../hyperliquid/ui/mode.ts";
import { TickContext } from "../../terminal/use-terminal.ts";

// The Hyperliquid watchlist (categories, search, windowing, risk badges) is
// loaded on demand so it never reaches the default demo bundle.
const HlWatchlist = lazy(() =>
  import("../../hyperliquid/ui/HlWatchlist.tsx").then((m) => ({ default: m.HlWatchlist })),
);

export interface WatchlistPanelProps {
  symbols: Array<{
    id?: string;
    name: string;
    displayName?: string | null;
    assetClass?: string;
    category?: string;
    isActive?: boolean;
  }>;
  ticks?: Record<string, { bid: number; ask: number; timestamp: number }>;
  selectedSymbol: string;
  onSelect: (s: string) => void;
  oneClick?: boolean;
  accountId?: string | null;
  isFeedConnected?: boolean;
}

/** The instrument list: the Hyperliquid variant when that adapter is installed, else the generic one. */
export function WatchlistPanel(props: WatchlistPanelProps) {
  // Fall back to the shared quote feed when the host doesn't pass ticks.
  const feed = useContext(TickContext);
  const ticks: Ticks = props.ticks ?? feed?.ticks ?? {};
  if (isHyperliquidMode()) {
    return (
      <Suspense fallback={null}>
        <HlWatchlist {...props} ticks={ticks} />
      </Suspense>
    );
  }
  return <GenericWatchlistPanel {...props} ticks={ticks} />;
}

// ── Watchlist v2 helpers ─────────────────────────────────────

type Ticks = Record<string, { bid: number; ask: number; timestamp: number }>;

/** Named custom lists: { id, name, symbols[] } persisted to localStorage. */
interface CustomList {
  id: string;
  name: string;
  symbols: string[];
}

function readStoredList<T>(key: string, fallback: T): T {
  try {
    const raw = safeStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Session change % — mid vs the first mid seen after mount. The demo feed has
 * no server-side session anchor, so the first observation is the reference
 * (assumption logged in AGENT_LOG).
 */
function useChangePercent(ticks: Ticks): Record<string, number> {
  const refsRef = useRef<Map<string, number>>(new Map());
  const [changes, setChanges] = useState<Record<string, number>>({});

  useEffect(() => {
    const compute = () => {
      const next: Record<string, number> = {};
      for (const [symbol, t] of Object.entries(ticks)) {
        const mid = (t.bid + t.ask) / 2;
        let ref = refsRef.current.get(symbol);
        if (ref == null || !Number.isFinite(ref)) {
          refsRef.current.set(symbol, mid);
          ref = mid;
        }
        if (ref > 0) next[symbol] = ((mid - ref) / ref) * 100;
      }
      setChanges(next);
    };
    compute();
    // Rows redraw at 1Hz — per-tick re-renders would redraw every row on
    // every WS flush for every symbol (the panels' shared 1Hz pattern).
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [ticks]);

  return changes;
}

/** Rolling per-symbol price buffer for the sparklines (last N mids). */
function useSparklines(ticks: Ticks, cap = 30): Record<string, number[]> {
  const buffersRef = useRef<Map<string, number[]>>(new Map());
  const [snapshot, setSnapshot] = useState<Record<string, number[]>>({});

  useEffect(() => {
    const capture = () => {
      let dirty = false;
      for (const [symbol, t] of Object.entries(ticks)) {
        const mid = (t.bid + t.ask) / 2;
        if (!Number.isFinite(mid)) continue;
        let buf = buffersRef.current.get(symbol);
        if (!buf) {
          buf = [];
          buffersRef.current.set(symbol, buf);
        }
        const last = buf[buf.length - 1];
        if (last !== mid) {
          buf.push(mid);
          if (buf.length > cap) buf.shift();
          dirty = true;
        }
      }
      if (dirty) {
        // Publish an immutable copy so the rows re-render on new data only.
        const next: Record<string, number[]> = {};
        for (const [symbol, buf] of buffersRef.current) next[symbol] = [...buf];
        setSnapshot(next);
      }
    };
    capture();
    const id = setInterval(capture, 1000);
    return () => clearInterval(id);
  }, [ticks, cap]);

  return snapshot;
}

/** 60×20 inline SVG polyline from a price buffer, colored by direction. */
function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) return <svg width={60} height={20} className="shrink-0" />;
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  const range = max - min || 1;
  const step = 60 / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(18 - ((p - min) / range) * 16).toFixed(1)}`)
    .join("");
  return (
    <svg width={60} height={20} className="shrink-0" aria-hidden>
      <path d={d} fill="none" stroke={up ? "#26a69a" : "#ef5350"} strokeWidth={1.2} />
    </svg>
  );
}

function GenericWatchlistPanel({
  symbols,
  ticks,
  selectedSymbol,
  onSelect,
  oneClick,
  accountId,
  isFeedConnected = true,
}: WatchlistPanelProps) {
  const [filter, setFilter] = useState("");
  const placeOrder = usePlaceOrder();

  const safeTicks: Ticks = ticks ?? {};
  const changes = useChangePercent(safeTicks);
  const sparklines = useSparklines(safeTicks);

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = safeStorage.getItem("watchlist_favorites");
      return saved ? new Set(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  // Favorite row order (drag-reorder target); symbols missing from the list
  // fall back to alphabetical behind the ordered ones.
  const [favOrder, setFavOrder] = useState<string[]>(() =>
    readStoredList<string[]>("watchlist_order", []),
  );
  const [customLists, setCustomLists] = useState<CustomList[]>(() =>
    readStoredList<CustomList[]>("watchlist_lists", []),
  );

  const toggleFavorite = useCallback((name: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      safeStorage.setItem("watchlist_favorites", JSON.stringify([...next]));
      return next;
    });
    // Keep the stored order in sync so a re-favorited symbol lands at the end.
    setFavOrder((prev) => {
      const isFav = favorites.has(name);
      const next = isFav ? prev.filter((n) => n !== name) : [...prev, name];
      safeStorage.setItem("watchlist_order", JSON.stringify(next));
      return next;
    });
  }, [favorites]);

  // ── Custom list mutations ──
  const createList = useCallback(() => {
    const name = window.prompt("List name", `List ${customLists.length + 1}`);
    if (!name) return;
    const list: CustomList = { id: crypto.randomUUID(), name, symbols: [] };
    const next = [...customLists, list];
    setCustomLists(next);
    safeStorage.setItem("watchlist_lists", JSON.stringify(next));
  }, [customLists]);
  const deleteList = useCallback(
    (id: string) => {
      const next = customLists.filter((l) => l.id !== id);
      setCustomLists(next);
      safeStorage.setItem("watchlist_lists", JSON.stringify(next));
    },
    [customLists],
  );
  const addTo = useCallback(
    (listId: string, symbol: string) => {
      const next = customLists.map((l) =>
        l.id === listId && !l.symbols.includes(symbol)
          ? { ...l, symbols: [...l.symbols, symbol] }
          : l,
      );
      setCustomLists(next);
      safeStorage.setItem("watchlist_lists", JSON.stringify(next));
      toast.success("Watchlist", `Added ${symbol}`);
    },
    [customLists],
  );
  const removeFrom = useCallback(
    (listId: string, symbol: string) => {
      const next = customLists.map((l) =>
        l.id === listId ? { ...l, symbols: l.symbols.filter((s) => s !== symbol) } : l,
      );
      setCustomLists(next);
      safeStorage.setItem("watchlist_lists", JSON.stringify(next));
    },
    [customLists],
  );

  // ── Drag-reorder (favorites / custom list rows) ──
  const dragFromRef = useRef<string | null>(null);
  const reorder = useCallback(
    (from: string, to: string) => {
      if (from === to) return;
      setFavOrder((prev) => {
        const base = prev.filter((n) => n !== from);
        const toIdx = base.indexOf(to);
        const next = [...base];
        next.splice(toIdx === -1 ? next.length : toIdx, 0, from);
        safeStorage.setItem("watchlist_order", JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const categories = useMemo(() => {
    const cats = new Set(symbols.map((s) => s.category || "Other"));
    return Array.from(cats).sort();
  }, [symbols]);

  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  /** Active custom list id (mutually exclusive with selectedCat). */
  const [activeListId, setActiveListId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = activeListId ? customLists.find((l) => l.id === activeListId) : null;
    return symbols
      .filter((s) => {
        if (filter && !s.name.toLowerCase().includes(filter.toLowerCase())) return false;
        if (list) return list.symbols.includes(s.name);
        if (selectedCat === "★") return favorites.has(s.name);
        if (selectedCat && selectedCat !== "★" && s.category !== selectedCat) return false;
        return s.isActive !== false;
      })
      .sort((a, b) => {
        // Ordered sections (favorites / custom) respect the drag order.
        if ((selectedCat === "★" || list) && activeListId == null) {
          const aIdx = favOrder.indexOf(a.name);
          const bIdx = favOrder.indexOf(b.name);
          if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
          if (aIdx !== -1) return -1;
          if (bIdx !== -1) return 1;
        }
        if (list) {
          const aIdx = list.symbols.indexOf(a.name);
          const bIdx = list.symbols.indexOf(b.name);
          if (aIdx !== bIdx) return aIdx - bIdx;
        }
        const aFav = favorites.has(a.name) ? 0 : 1;
        const bFav = favorites.has(b.name) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;
        return a.name.localeCompare(b.name);
      });
  }, [symbols, filter, selectedCat, activeListId, customLists, favorites, favOrder]);

  const activeList = activeListId ? customLists.find((l) => l.id === activeListId) : null;
  const draggable = selectedCat === "★" && activeListId == null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border bg-secondary">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Watchlist
        </h3>
        <input
          placeholder="Search..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full text-xs"
        />
      </div>
      <div className="flex gap-1 px-2 py-1 border-b border-border overflow-x-auto text-[10px] no-scrollbar">
        <button
          onClick={() => {
            setSelectedCat(null);
            setActiveListId(null);
          }}
          className={cn(
            "px-2 py-0.5 rounded whitespace-nowrap",
            !selectedCat && !activeListId
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary",
          )}
        >
          All
        </button>
        <button
          onClick={() => {
            setSelectedCat("★");
            setActiveListId(null);
          }}
          className={cn(
            "px-2 py-0.5 rounded whitespace-nowrap flex items-center gap-0.5",
            selectedCat === "★"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-secondary text-yellow-400",
          )}
        >
          <Star className="h-2.5 w-2.5" fill="currentColor" />
          {favorites.size > 0 && <span className="text-[9px]">{favorites.size}</span>}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => {
              setSelectedCat(c);
              setActiveListId(null);
            }}
            className={cn(
              "px-2 py-0.5 rounded whitespace-nowrap",
              selectedCat === c && !activeListId
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary",
            )}
          >
            {c}
          </button>
        ))}
        {customLists.length > 0 && <span className="w-px bg-border shrink-0 mx-0.5" />}
        {customLists.map((l) => (
          <button
            key={l.id}
            onClick={() => {
              setActiveListId(l.id);
              setSelectedCat(null);
            }}
            className={cn(
              "px-2 py-0.5 rounded whitespace-nowrap flex items-center gap-1",
              activeListId === l.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary text-muted-foreground",
            )}
          >
            {l.name}
            <span
              role="button"
              aria-label={`Delete list ${l.name}`}
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                deleteList(l.id);
              }}
              className="hover:text-destructive"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          </button>
        ))}
        <button
          onClick={createList}
          title="New custom list"
          aria-label="New custom list"
          className="px-1.5 py-0.5 rounded whitespace-nowrap text-muted-foreground hover:bg-secondary hover:text-foreground shrink-0"
        >
          <ListPlus className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((s) => {
          const t = ticks?.[s.name];
          const isFav = favorites.has(s.name);
          const change = changes[s.name];
          const up = (change ?? 0) >= 0;
          const handleQuickTrade = (side: "BUY" | "SELL") => {
            if (!isFeedConnected) {
              toast.warning("No Data Feed", "Cannot trade while disconnected");
              return;
            }
            if (!accountId) {
              toast.warning("No Account", "Select an account first");
              return;
            }
            placeOrder.mutate(
              {
                accountId,
                symbol: s.name,
                side,
                type: "MARKET",
                quantity: 0.1,
              },
              {
                onSuccess: () => toast.success("Quick Trade", `${side} 0.1 ${s.name}`),
                onError: (err: unknown) =>
                  toast.error("Trade Failed", (err as { message?: string })?.message || "Failed"),
              },
            );
          };
          return (
            <div
              key={s.id || s.name}
              draggable={draggable && isFav}
              onDragStart={() => {
                dragFromRef.current = s.name;
              }}
              onDragOver={(e) => {
                if (draggable) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragFromRef.current;
                dragFromRef.current = null;
                if (from) reorder(from, s.name);
              }}
              className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-secondary border-b border-border/30 group",
                s.name === selectedSymbol && "bg-secondary",
                draggable && isFav && "cursor-grab active:cursor-grabbing",
              )}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(s.name);
                }}
                onContextMenu={(e) => {
                  // Right-click / long-press a row's star → add to a custom list.
                  e.preventDefault();
                  if (customLists.length === 0) {
                    toast.info("Watchlist", "Create a list first (list+ chip above)");
                    return;
                  }
                  const names = customLists.map((l, i) => `${i + 1}. ${l.name}`).join("\n");
                  const pick = window.prompt(
                    `Add ${s.name} to which list?\n${names}`,
                    "1",
                  );
                  if (pick == null) return;
                  const list = customLists[Number(pick) - 1];
                  if (list) addTo(list.id, s.name);
                }}
                className={cn(
                  "shrink-0 mr-1",
                  isFav ? "text-yellow-400" : "text-muted-foreground/20 hover:text-yellow-400/60",
                )}
                aria-label={isFav ? `Unfavorite ${s.name}` : `Favorite ${s.name}`}
                title="Click: favorite · Right-click: add to list"
              >
                <Star className="h-3 w-3" fill={isFav ? "currentColor" : "none"} />
              </button>
              <button onClick={() => onSelect(s.name)} className="text-left flex-1 min-w-0">
                <div className="font-semibold">{s.name}</div>
                <div className="text-[10px] text-muted-foreground">{s.category}</div>
              </button>
              <Sparkline points={sparklines[s.name] ?? []} up={up} />
              {t ? (
                <div className="flex items-center gap-1.5 ml-1.5">
                  <div className="text-right font-mono">
                    <div className="text-buy">{formatNumber(t.bid, 5)}</div>
                    <div className="text-sell">{formatNumber(t.ask, 5)}</div>
                  </div>
                  <div
                    className={cn(
                      "w-14 text-right font-mono text-[10px] font-semibold tabular-nums",
                      up ? "text-buy" : "text-sell",
                    )}
                  >
                    {change == null
                      ? "--"
                      : `${up ? "+" : ""}${change.toFixed(2)}%`}
                  </div>
                  {oneClick && (
                    <div className="hidden gap-0.5 ml-1 max-md:flex md:flex-col md:group-hover:flex">
                      <button
                        onClick={() => handleQuickTrade("BUY")}
                        className="px-1 py-0.5 text-[8px] rounded bg-buy/20 text-buy hover:bg-buy/30 font-semibold"
                      >
                        B
                      </button>
                      <button
                        onClick={() => handleQuickTrade("SELL")}
                        className="px-1 py-0.5 text-[8px] rounded bg-sell/20 text-sell hover:bg-sell/30 font-semibold"
                      >
                        S
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
              {activeList && (
                <button
                  onClick={() => removeFrom(activeList.id, s.name)}
                  aria-label={`Remove ${s.name} from ${activeList.name}`}
                  className="ml-1 p-0.5 rounded text-muted-foreground/40 hover:text-destructive shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        {activeList && filtered.length === 0 && (
          <div className="p-4 text-xs text-muted-foreground text-center">
            This list is empty — use a row's ⭐ menu on the All tab, then add symbols from
            search.
          </div>
        )}
      </div>
    </div>
  );
}
