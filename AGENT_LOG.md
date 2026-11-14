# TV2 — Agent Log

> Continuity file. Entries are **prepended** (newest first) and never deleted.
> Every entry: session date, agent/tool, feature, what changed, touched files,
> commit hash, pending items, notes for the next agent.

---

## 2026-11-14 — Session 2 · Feature 3: Price-scale pack (countdown all TFs, prev-close, day H/L, last-price label)

- **Agent/tool:** OpenCode (GLM) · branch `auto/price-scale-pack` → PR → merge
- **Plan (reviewed first):** four price-scale upgrades. (1) Countdown on ALL timeframes:
  drop the `>= 86_400_000` early return — daily buckets are UTC-midnight aligned and weekly
  Monday-00:00 UTC (crypto adapters); formatCountdown already renders H:MM:SS. Fixes the
  logged "countdown hidden on 1d/1w" bug. (2) Prev-close dotted price line at the previous
  UTC-day close, derived from the loaded candles (no new API surface); shown only when
  today's bars exist in the loaded history; skipped on the 1w timeframe. (3) Day high/low
  as scale-only labels (priceLineVisible:false + axisLabelVisible — lightweight-charts has
  no native scale marks). (4) Last-price label pref (`showLastPriceLabel`, default OFF —
  the mid label stacks with the Ask label on 1-pip-spread symbols; bid/ask lines are the
  terminal's authoritative right-edge prices). Prefs: `showPrevCloseLine` (default ON),
  `showLastPriceLabel` (default OFF) in BOOL/TEMPLATE keys + Chart Settings rows.
- **Recorded assumptions:** UTC-aligned day/week buckets (crypto feeds only); prev close
  = close of the last bar before UTC midnight, hidden when today's bars aren't loaded;
  last-price label shows the series mid (rounds into the ask label on tight spreads).
- **What changed:** countdown now runs on every timeframe (1d = UTC midnight bucket,
  1w = Monday 00:00 UTC; fixes the logged "hidden on 1d/1w" bug). New `dayStats` memo
  derives prev-close/day-high/day-low from loaded candles; three price lines applied via
  a chartEpoch-keyed effect — prev close as a full-width dotted line, day high/low as
  scale-only labels (lineVisible:false). New prefs `showPrevCloseLine` (ON) and
  `showLastPriceLabel` (OFF — stacks with the Ask label on tight spreads) wired through
  createPriceSeries (common lastValueVisible), the swap effect, a live applyOptions
  effect, and two Chart Settings rows.
- **Touched files:** hooks/useChartPreferences.ts, pages/trading/ChartPanel.tsx,
  pages/trading/ChartSettingsDialog.tsx, AGENT_LOG.md
- **Commit:** branch `auto/price-scale-pack` → PR `<fill>`
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **762 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅
- **Pending/notes:** session-aware prev close for FX/metals (trading-hours close) when a
  non-crypto adapter lands.

## 2026-11-14 — Session 2 · Feature 2: Chart-type selector (5 types)

- **Agent/tool:** OpenCode (GLM) · branch `auto/chart-types` → PR → merge
- **Plan (reviewed first):** candles-only chart gains a TradingView-style type selector:
  candles / line / area / baseline / bars. Series type lives in chart preferences
  (`chartType` string pref, persisted per trader + included in templates). Lightweight-
  charts v4 series swap in the existing create/destroy effect keyed by chartEpoch; the
  imperative pump keeps using the interface (update/setData applyOptions unaffected);
  applyServerCandle/buildTickBar untouched (regression gate respected). Selector UI:
  chart-type dropdown in ChartToolbar (candles icon) + appearance tab in
  ChartSettingsDialog. Indicator overlay + volume histogram unaffected (separate
  series). Note: main now carries parallel-session commits (replay clock) — rebase
  onto fresh main before pushing; never `git add -A`.
- **Recorded assumptions:** hollow/step/renko deferred (custom renderers, later batch);
  line/area/baseline use close prices; baseline basis = series median of visible? —
  no: first-loaded close (stable, no per-zoom recompute).
- **What changed:** `chartType` union pref (candles/line/area/baseline/bars) in
  useChartPreferences (string-pref + template key + storage guard). ChartPanel creates
  the series per type behind the existing create/destroy effect — the pump/RT ctx types
  were loosened to `ISeriesApi<SeriesType>` so the swap is transparent; an rAF-scheduled
  chartEpoch bump rebuilds on type change (data effects re-hydrate; indicators +
  challenge levels re-bind via their epoch hooks). ChartToolbar gains a 5-button type
  selector; ChartSettingsDialog Appearance tab gains a Series row. baseline basis is
  seeded from the first loaded close on hydrate (stable, no per-zoom recompute).
- **Touched files:** hooks/useChartPreferences.ts, pages/trading/ChartPanel.tsx,
  pages/trading/ChartToolbar.tsx, pages/trading/ChartSettingsDialog.tsx,
  pages/TradingPage.tsx, pages/trading/useIndicators.ts,
  pages/trading/useChallengeLevels.ts, pages/trading/useSlTpDrag.ts,
  lib/chart-plugins/drawing-tools/manager.ts (setSeries), AGENT_LOG.md
- **Commit:** branch `auto/chart-types` (`fa8c20e`, cherry-picked via git worktree —
  shared VPS clone hosts a parallel session) → squash-merged `d7ca59f` (PR #13, CI green;
  E2E failed once on a pre-existing dual-ConnectButton strict-mode flake in the
  Hyperliquid onboarding spec, rerun green → merged)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **762 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅
- **Pending/notes:** hollow candles + step line + renko/range/kagi/P&F in a later batch.

## 2026-11-13 — Session 2 · Feature 1: Price alerts v1 (real, persistent)

- **Agent/tool:** OpenCode (GLM) · branch `auto/price-alerts-v1` → PR → merge
- **Plan (reviewed files first):** replace the mobile "coming soon" stub with a real
  alert engine. Pure evaluator `lib/price-alerts.ts` (cross/above/below ×
  once/every-time × expiry 1h/4h/1d/1w, 30s refire cooldown, persistence helpers).
  Engine hook `hooks/usePriceAlerts.ts`: one zustand subscription on the trading
  store's tick map (same pattern as the chart render pump — zero React re-renders),
  fires toast + WebAudio beep + browser Notification. Shared panel
  `components/PriceAlertsPanel.tsx` (add form prefilled with live bid + active/
  triggered lists) mounted in the mobile Alerts tab (bottom sheet) and a new desktop
  right-rail "Price Alerts" tab (toolbar bell). ChartContextMenu "Add alert at price"
  now also registers a persistent every-time alert. Unit tests for the evaluator
  (conditions, once/refire, expiry, cooldown, persistence round-trip + corrupt data).
  Regression gate: render-pump/live/replay tests untouched.
- **Recorded assumptions:** v1 is client-side (safeStorage → localStorage, 100-alert
  cap); server-side delivery is a later roadmap item. Expiry presets none/1h/4h/1d/1w.
  "above/below" trigger only on a *crossing* tick (already-at-level does not fire).
- **What changed:** new `lib/price-alerts.ts` (pure evaluator + persistence), new
  `hooks/usePriceAlerts.ts` (store + tick-subscription engine, zero React renders/tick),
  new `components/PriceAlertsPanel.tsx` (+ `PriceAlertsPanelLive` wrapper) shared by the
  mobile Alerts tab and a new desktop right-rail tab (toolbar bell). ChartContextMenu
  "Add alert at price" registers a persistent every-time alert too. Mobile "coming soon"
  stub removed. 14 unit tests added.
- **Touched files:** lib/price-alerts.ts (new), hooks/usePriceAlerts.ts (new),
  components/PriceAlertsPanel.tsx (new), components/MobileTradingPanel.tsx,
  pages/TradingPage.tsx, pages/trading/ChartPanel.tsx, pages/trading/ChartToolbar.tsx,
  __tests__/price-alerts.test.ts (new), AGENT_LOG.md
- **Commit:** branch `f76a19c` → squash-merged `74d4ab2` (PR #12, CI+E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **762 passed | 1 skipped**
  (748 baseline + 14 new) ✅ · `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within
  budget ✅
- **Pending/notes:** drawing-cross + indicator-cross alert types → later; server-side
  persistent alerts + offline delivery → VPS roadmap item.

## 2026-11-13 — Session 2 · Feature 0: Theme token migration (DESIGN.TV2.md)

- **Agent/tool:** OpenCode (GLM) · branch `auto/theme-tv-palette` → PR → merge
- **Plan:** swap every Binance-palette token/hex to the TradingView palette per
  DESIGN.TV2.md §2 + master spec §5.2. Files: `src/styles/global.css` (:root dark +
  .light token values; remove unused glow classes + --glow + .live-pulse),
  `src/pages/trading/constants.ts` (CHART_COLORS dark/light), stray hexes in
  delta-tooltip-pane.ts, tooltip-element.ts, drawing-tools/manager.ts + renderers.ts,
  lib/indicators.ts, ChartPanel.tsx, DrawingToolsOverlay.tsx, NewsOverlay.tsx,
  useChallengeLevels.ts; DESIGN.md → pointer to DESIGN.TV2.md (which gets committed).
  Tests: existing 748 must stay green (no test asserts colors — verified); finish gate
  grep old hexes = 0 in src.
- **Recorded assumptions:** muted text uses #8a8e9c dark / #6c7280 light (muted
  #787b86 sits at 4.2:1 — AA gate wins, hue family preserved) · light-mode
  market-direction *text* darkened (#087f52/#d43a4d) while chart candles stay
  #26a69a/#ef5350 · ink-on-fill = #131722 in dark (5.1:1 on teal/red), white in light ·
  destructive-foreground = dark ink on #ef5350 (white is 3.5:1) · OHLC/delta tooltips
  remain white chips in both themes (theme-aware tooltip = logged bug, later pass) ·
  SMA recolored cyan, BOLL teal (gold reserved for pending orders per contract).
- **What changed:** CSS token layer (:root dark + .light) swapped to the TV palette;
  CHART_COLORS dark/light; unused glow classes + --glow + .live-pulse removed; body bg
  in app.css → #131722; 14 src files' stray hexes mapped (blues → #2962FF, greens/reds →
  #26a69a/#ef5350, grays → #8a8e9c, canvas/card/border hexes → contract values); DESIGN.md
  rewritten as a pointer; DESIGN.TV2.md committed as the contract.
- **Touched files:** global.css, app.css, constants.ts, indicators.ts, useIndicators.ts,
  delta-tooltip-pane.ts, tooltip-element.ts, manager.ts, renderers.ts, resolve.ts,
  ChartPanel.tsx, DrawingToolsOverlay.tsx, NewsOverlay.tsx, useChallengeLevels.ts,
  DESIGN.md, DESIGN.TV2.md (new), AGENT_LOG.md
- **Commit:** branch `ccf97c6` → squash-merged `1eaa6cd` (PR #11, CI+E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **748 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size 72% raw / 69% gzip — within budget ✅ ·
  finish gate: old-hex grep in src = **0** ✅
- **Pending/notes:** theme-aware OHLC tooltip logged for the dialog/legend pass.

---

## 2026-11-13 — Session 1 (audit + baseline)

- **Agent/tool:** OpenCode (GLM) on Android, VPS build runner (`/home/ubuntu/apps/TV2`)
- **Feature:** STEP ZERO — full TradingView parity audit (no feature code)
- **What changed:** created `TV2_PARITY_AUDIT.md` (repo map, parity matrix, bugs,
  perf risks, priority roadmap) and this log. No src changes.
- **Touched files:** `TV2_PARITY_AUDIT.md`, `AGENT_LOG.md`
- **Commit:** `602e85f`
- **Verified baseline:** typecheck ✅ · lint 0 warnings ✅ · tests **748 passed | 1 skipped** ✅ ·
  build ✅ (VPS run `verify6`, log `/home/ubuntu/jobs/verify6.log`)
- **Key facts for the next agent:**
  - Working flow: edit on phone (`~/OpenCharts`) → `tar` changed paths to
    `ubuntu@84.13.154.150:/home/ubuntu/apps/TV2/` → typecheck/lint → `jrun` test+build →
    commit+push (git identity already `ferdausfs`). `gh` CLI is on the **phone** only.
  - CI runs on `main` + PRs; e2e.yml runs on PRs only; deploy-demo.yml deploys on `main`.
  - **Design contract = DESIGN.TV2.md** (TradingView palette). `DESIGN.md` is superseded —
    pointer rewrite is part of feature 0.
  - Roadmap order is in `TV2_PARITY_AUDIT.md` §5; feature 1 = Alerts v1 (mobile-first user value).
  - Baseline regression tests: render pump, live data, replay chain — never break these.
- **Pending:** feature 0 (theme migration) → feature 1 (Alerts v1) → …
