# TV2 — Agent Log

> Continuity file. Entries are **prepended** (newest first) and never deleted.
> Every entry: session date, agent/tool, feature, what changed, touched files,
> commit hash, pending items, notes for the next agent.

---

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
- **Commit:** `<fill>`
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
