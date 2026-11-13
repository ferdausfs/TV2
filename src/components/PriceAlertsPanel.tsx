// Price-alerts panel — shared by the mobile Alerts tab (bottom sheet) and the
// desktop right rail (roadmap feature 1). Add form + active/triggered lists;
// persistence and triggering live in hooks/usePriceAlerts.ts + lib/price-alerts.ts.
import { useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { BellRing, Trash2 } from "lucide-react";
import { TickContext } from "../terminal/use-terminal.ts";
import { usePriceAlertsStore } from "../hooks/usePriceAlerts.ts";
import type { AlertCondition, AlertExpiry, PriceAlert } from "../lib/price-alerts.ts";

/**
 * Wrapper that reads the live bid from the shared TickContext — keeps the
 * tick-driven re-render scoped to this panel (mounted only when visible).
 */
export function PriceAlertsPanelLive({ symbol }: { symbol: string }) {
  const feed = useContext(TickContext);
  const bid = feed?.tick?.bid ?? 0;
  return <PriceAlertsPanel symbol={symbol} bid={bid} />;
}

export function PriceAlertsPanel({ symbol, bid }: { symbol: string; bid: number }) {
  const alerts = usePriceAlertsStore((s) => s.alerts);
  const addAlert = usePriceAlertsStore((s) => s.addAlert);
  const removeAlert = usePriceAlertsStore((s) => s.removeAlert);
  const clearTriggered = usePriceAlertsStore((s) => s.clearTriggered);

  const [edited, setEdited] = useState<string | null>(null);
  const [condition, setCondition] = useState<AlertCondition>("cross");
  const [once, setOnce] = useState(true);
  const [expiry, setExpiry] = useState<AlertExpiry>("none");

  // The field shows the live bid until the user edits it (derived state — no
  // effect-driven syncing).
  const price = edited ?? (bid > 0 ? bid.toFixed(5) : "");

  const parsed = Number.parseFloat(price);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const symbolAlerts = alerts.filter((a) => a.symbol === symbol);
  const triggered = symbolAlerts.filter((a) => a.triggeredAt != null);

  const submit = () => {
    if (!valid) return;
    addAlert({ symbol, price: parsed, condition, once, expiry });
    setEdited(null);
  };

  return (
    <div className="p-3 space-y-3 overflow-y-auto">
      {/* Add form */}
      <div className="rounded-lg border border-border bg-secondary/30 p-2.5 space-y-2.5">
        <div className="text-xs font-medium text-muted-foreground">
          Alert on <span className="text-foreground font-semibold">{symbol}</span>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={price}
            onChange={(e) => {
              setEdited(e.target.value);
            }}
            placeholder="Price"
            aria-label="Alert price"
            className="flex-1 min-w-0 px-3 py-2.5 bg-secondary border border-border rounded-lg text-foreground text-sm font-mono text-center focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!valid}
            aria-label="Add price alert"
            className={cn(
              "px-4 rounded-lg text-sm font-semibold transition active:scale-[0.98]",
              valid
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground opacity-50",
            )}
          >
            Set
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { key: "cross", label: "Cross" },
              { key: "above", label: "Above" },
              { key: "below", label: "Below" },
            ] as const
          ).map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCondition(c.key)}
              className={cn(
                "py-2 rounded-lg text-xs font-medium transition border",
                condition === c.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setOnce(true)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition border",
              once
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border",
            )}
          >
            Once
          </button>
          <button
            type="button"
            onClick={() => setOnce(false)}
            className={cn(
              "flex-1 py-2 rounded-lg text-xs font-medium transition border",
              !once
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border",
            )}
          >
            Every time
          </button>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {(["none", "1h", "4h", "1d", "1w"] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setExpiry(e)}
              className={cn(
                "py-2 rounded-lg text-[11px] font-medium transition border",
                expiry === e
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border",
              )}
            >
              {e === "none" ? "No expiry" : e}
            </button>
          ))}
        </div>
      </div>

      {/* Active alerts */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Active ({symbolAlerts.length - triggered.length})
          </span>
          {triggered.length > 0 && (
            <button
              type="button"
              onClick={clearTriggered}
              className="text-[10px] text-muted-foreground underline-offset-2 active:underline"
            >
              Clear triggered
            </button>
          )}
        </div>
        {symbolAlerts.filter((a) => a.triggeredAt == null).length === 0 && (
          <div className="text-center py-4 text-muted-foreground text-xs">
            No active alerts on {symbol}
          </div>
        )}
        {symbolAlerts
          .filter((a) => a.triggeredAt == null)
          .map((a) => (
            <AlertRow key={a.id} alert={a} onRemove={removeAlert} />
          ))}
      </div>

      {/* Triggered history */}
      {triggered.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-0.5">
            Triggered
          </span>
          {triggered.map((a) => (
            <AlertRow key={a.id} alert={a} onRemove={removeAlert} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({
  alert,
  onRemove,
}: {
  alert: PriceAlert;
  onRemove: (id: string) => void;
}) {
  const triggered = alert.triggeredAt != null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-2 rounded-lg border bg-card",
        triggered ? "border-border/50 opacity-60" : "border-border",
      )}
    >
      <BellRing
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          triggered ? "text-muted-foreground" : "text-warning",
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
            {alert.price}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {alert.condition} · {alert.once ? "once" : "every time"}
            {alert.expiresAt > 0 && !triggered ? " · exp" : ""}
            {triggered ? " · fired" : ""}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground/70">{alert.symbol}</div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(alert.id)}
        aria-label={`Delete alert at ${alert.price}`}
        className="p-1.5 rounded-md text-muted-foreground active:bg-secondary"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
