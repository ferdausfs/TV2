# TV2 — Agent Log

> Continuity file. Entries are **prepended** (newest first) and never deleted.
> Every entry: session date, agent/tool, feature, what changed, touched files,
> commit hash, pending items, notes for the next agent.

---

## 2026-11-14 — Session 2 · Hygiene: demo-feed stop-while-priming race (leaked interval)

- **Agent/tool:** OpenCode (GLM) · branch `auto/feed-race-fix` → PR → merge
- **What changed:** `startDemoFeed`/`stopDemoFeed` in services/demo/feed.ts gained a
  generation token: stop-while-priming no longer lets the in-flight `.then` re-seed
  cursors and arm a leaked `setInterval` (the cause of the intermittent "window is not
  defined" unhandled error after vitest teardown — hit main CI once after #15).
- **Touched files:** services/demo/feed.ts, AGENT_LOG.md
- **Commit:** branch `auto/feed-race-fix` (`85efb7a`) → squash-merged `a67b739`
  (PR #16, CI + E2E green)
- **Results:** adapter.test 20/20 ✅ · typecheck ✅

## 2026-11-14 — Session 2 · Feature 7: Indicator catalog batch 1 (8 new indicators)

- **Agent/tool:** OpenCode (GLM) · branch `auto/indicator-batch1` → PR → merge
- **Plan (reviewed first):** add 8 indicators to the registry + calc lib, wired through
  the feature-6 instance infra (each is registry entry + paramSpecs + a useIndicators
  case): WMA(20, overlay), HMA(20, overlay), Keltner Channels(20, 2×ATR, overlay),
  Donchian Channels(20, overlay), StochRSI(14/14/3/3, below), OBV(below, no inputs),
  Williams %R(14, below), ROC(9, overlay). All computed in `lib/indicators.ts` from
  the existing candle source; sub-pane placement via the existing pseudo-scale ids
  (`rsi`-style dedicated priceScaleIds). Colors kept TV-palette-adjacent.
  Tests: unit tests for each new calc (hand-computed values + NaN head behaviour
  matching the existing calc test style).
- **Recorded assumptions:** HMA = WMA(2×WMA(n) − WMA(n/2), √n) standard definition;
  Keltner basis EMA(20) with ATR(20)±mult; Donchian uses highest-high/lowest-low of
  the window inclusive of the current bar; StochRSI = stochastic of RSI, %K = raw
  stoch, %D = SMA(3) of %K; W%R = (HH−C)/(HH−LL)×−100; ROC = 100×(C/C[n]−1), leading
  NaNs aligned like the other calcs.
- **What changed:** `lib/indicators.ts` gains 8 calcs — wma (linear weights),
  hma (WMA of 2·WMA(n/2)−WMA(n) over √n, tail-aligned), keltnerChannels (EMA basis ±
  mult·ATR, tail-aligned with ATR's one-bar delay), donchianChannels (HH/LL inclusive),
  stochRsi (stochastic of the RSI series), obv (cumulative signed volume, starts 0),
  williamsR (−100..0), roc (percent change). Registry: 8 entries with paramSpecs +
  TV-palette-adjacent colors; IndicatorType now 16 members. useIndicators: one case per
  new type; sub-panes on dedicated pseudo-scales (stochrsi/obv/wpr/roc); overlays share
  "right". StochRSI %D and Keltner/Donchian mid styling follow the existing STOCH/BOLL
  conventions. indicators.test.ts: +14 tests (67 total in file), all hand-verified.
- **Touched files:** lib/indicators.ts, pages/trading/useIndicators.ts,
  __tests__/indicators.test.ts, AGENT_LOG.md
- **Commit:** branch `auto/indicator-batch1` → PR `<fill>`
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **780 passed | 1 skipped** ✅
  (baseline 762 → 780) · `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅

## 2026-11-14 — Session 2 · Feature 6: Indicator infra — instances, per-indicator settings, menu search/favorites, legend rows

- **Agent/tool:** OpenCode (GLM) · branch `auto/indicator-infra` → PR → merge
- **Plan (reviewed first):** move indicators from a flat type list to **instance-based**
  state: `IndicatorInstance = { id, type, params, color?, visible }` persisted in trader
  prefs (`indicatorInstances`, JSON, like activePlugins). Registry gains `paramSpecs`
  (key/label/min/max/step/default) so Inputs dialogs are generated, not hand-written.
  `useIndicators` re-keys series by instance id (`<id>:<sub>`), applies visibility via
  `applyOptions({visible})`, recomputes data on param change, applies color/width on
  style change. Back-compat: `activeIndicators` (types) derived from instances;
  `toggleIndicator(type)` toggles the first instance of that type; template
  `indicators: string[]` maps to default-param instances on apply. UI: (1) legend
  header gains one row per indicator (colored dot + label + eye/gear/✕ — pointer-events
  re-enabled per row); (2) new `IndicatorSettingsDialog` (Inputs + Style tabs, opened
  from the gear); (3) toolbar menu gains a search input and favorites (star, persisted
  `indicatorFavorites`), favorites pinned on top.
- **Recorded assumptions:** one instance per type initially (multi-instance supported by
  the model, UI allows adding the same type again); template apply resets params to
  defaults (v1 templates only stored type strings); VWAP has no inputs (session-anchored).
- **What changed:** new `lib/indicator-instances.ts` (instance model + storage
  sanitize/repair, `makeInstance`, `seriesKey` = `<id>:<sub>`); registry gained
  `paramSpecs` (generated Inputs dialogs) + `defaultParamsFor`. Prefs:
  `indicatorInstances` + `indicatorFavorites` (JSON strings, repaired on read).
  Terminal context: instance CRUD (`add/remove/updateIndicator`,
  `toggleIndicatorFavorite`) + derived `activeIndicators` for legacy consumers;
  `toggleIndicator(type)` toggles the first instance of the type; template
  `setIndicators` maps type strings → default-param instances. `useIndicators`
  re-keyed per instance, `applyOptions` for style changes, visibility via the eye
  (series simply not painted). UI: per-indicator legend rows (dot/label/eye/gear/✕),
  `IndicatorSettingsDialog` (Inputs from paramSpecs + Style color), toolbar menu with
  search + favorites sections.
- **Touched files:** lib/indicators.ts, lib/indicator-instances.ts (new),
  hooks/useChartPreferences.ts, terminal/context.tsx, terminal/use-terminal.ts,
  pages/trading/useIndicators.ts, pages/trading/ChartPanel.tsx,
  pages/trading/ChartToolbar.tsx, pages/trading/IndicatorSettings.tsx (new),
  pages/TradingPage.tsx, AGENT_LOG.md
- **Commit:** branch `auto/indicator-infra` (`fb7208a`) → squash-merged `3bb384c`
  (PR #18, CI + E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **762 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅

## 2026-11-14 — Session 2 · Feature 5: Timeframes +3m / +2h / +1M

- **Agent/tool:** OpenCode (GLM) · branch `auto/timeframes` → PR → merge
- **Plan (reviewed first):** extend the timeframe set to
  1m/3m/5m/15m/30m/1h/2h/4h/1d/1w/1M. TF_INTERVAL_MS gains 3m/2h (exact) and 1M
  (30d approximation for gap/staleness math only). `getCandleBucketTime` special-cases
  1M (UTC month start) and 1w (Monday 00:00 UTC) — this also fixes the logged
  weekly-bucket phantom-bar misalignment for live ticks (the epoch floor lands on a
  Thursday, months are 28–31d). Countdown effect: 1M → next UTC-month start; 1d/1w
  already UTC-midnight/Monday-aligned. `deepLimitFor` in terminal/context gains
  3m → 3000, 2h → 6000, 1M → 260 (monthly depth halved vs weekly). Demo candles
  TF_SECONDS gains 3m/2h/1M. Binance adapter passes timeframe through verbatim —
  3m/2h/1M are native Binance intervals, no adapter change.
- **Recorded assumptions:** weekly buckets Monday 00:00 UTC, monthly on the 1st
  (Binance alignment); +1s timeframe deferred until a confirmed feed supports it.
- **What changed:** TIMEFRAMES extended to 11 entries (constants.ts + TF_INTERVAL_MS;
  1M = 30d approximation for gap/staleness math). `getCandleBucketTime` special-cases
  1M (UTC month start) and 1w (Monday 00:00 UTC) — fixes the logged weekly
  phantom-bar misalignment where live ticks painted onto epoch-floored buckets.
  Countdown timer: 1M branch targets the next UTC-month start. `deepLimitFor` gains
  3m → 3000 / 2h → 6000 / 1M → 260. Demo TF_SECONDS gains 3m/2h/1M. Toolbar renders
  all 11 (overflow-scroll already present).
- **Touched files:** pages/trading/constants.ts, pages/trading/utils.ts,
  pages/trading/ChartPanel.tsx, terminal/context.tsx, services/demo/candles.ts,
  AGENT_LOG.md
- **Commit:** branch `auto/timeframes` (`9ecf552`) → squash-merged `531f537`
  (PR #17, CI + E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **762 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅

## 2026-11-14 — Session 2 · Feature 4: Scales — log/percent/auto, range buttons, go-to-date

- **Agent/tool:** OpenCode (GLM) · branch `auto/scale-controls` → PR → merge
- **Plan (reviewed first):** TradingView-style scale controls in a compact footer bar
  pinned inside the chart host (bottom-right, horizontally scrollable on mobile):
  Auto toggle (priceScale.autoScale), Log/Percent mode buttons (PriceScaleMode via
  priceScale("right").applyOptions), range buttons 1D/5D/1M/3M/6M/YTD/1Y/All
  (setVisibleRange from the latest loaded bar; All = fitContent), and a go-to-date
  popover (native date input → binary-search the loaded bars → setVisibleLogicalRange
  around the target index — left-edge history loader then loads older bars naturally).
  New prefs: `priceScaleMode` (string, guarded union, default normal, template key) and
  `priceScaleAuto` (bool, default true, template key) applied via a chartEpoch-keyed
  effect; handleResetView syncs priceScaleAuto so the toggle stays truthful.
- **Recorded assumptions:** range jumps operate on LOADED data — jumping beyond the
  loaded window shows the oldest loaded bars until the scroll-triggered history loader
  fills in (progressive, TradingView-like); YTD = Jan 1 UTC; month/year spans are
  calendar-approximate (30d/365d steps, no per-month day-count math in v1).
- **What changed:** new `pages/trading/ChartScaleFooter.tsx` — Auto/Log/% buttons,
  range buttons 1D/5D/1M/3M/6M/1Y/5Y/YTD/All, and a go-to-date popover (native date
  input → binary search → setVisibleLogicalRange). New prefs `priceScaleMode`
  (guarded union, template key) + `priceScaleAuto` (bool, template key) applied via a
  chartEpoch-keyed `priceScale("right")` effect; handleResetView syncs the Auto toggle;
  footer mounted inside the chart host.
- **Touched files:** pages/trading/ChartScaleFooter.tsx (new), pages/trading/ChartPanel.tsx,
  hooks/useChartPreferences.ts, AGENT_LOG.md
- **Commit:** branch `auto/scale-controls` (`b0d27c6`) → squash-merged `8c3674e`
  (PR #15, CI+E2E green; a later main-push CI failed on the demo-feed teardown flake —
  rerun green, root cause fixed in the hygiene PR above)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **762 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅
- **Pending/notes:** per-symbol scale persistence (TV stores scale per symbol) later.

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
- **Commit:** branch `auto/price-scale-pack` (`2e5e987` + e2e stabilization `734e011`)
  → squash-merged `709f15f` (PR #14, CI green; E2E hit the dual-ConnectButton flake once,
  fixed by scoping the returning-user locator to `hl-topbar`, rerun green → merged)
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
