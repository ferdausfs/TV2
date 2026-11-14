# TV2 — Agent Log

> Continuity file. Entries are **prepended** (newest first) and never deleted.

## 2026-11-14 — Session 3 · Feature 21: chart-only mobile (top bar + bottom nav + News removed)

- **Agent/tool:** OpenCode (GLM) · branch `auto/chart-only-mobile` → PR #34 → squash-merged `889f6a6`
- **Request:** user said "এখন ওপরে যা আছে.. সব রিমুভ করো" — phone-এ শুধু চার্ট রাখো।
- **What changed:** TradingPage.tsx — ChartToolbar মোবাইলে `hidden md:block`, Account Bar,
  MobileChartActions, MobileTradingPanel sheet সরানো + unused imports/vars ক্লিন; ChartPanel.tsx —
  NewsOverlay রেন্ডার + useNewsOverlay হুক সম্পূর্ণ সরানো, `onOpenNewsConfig` no-op। ডেস্কটপ অপরিবর্তিত।
- **Touched files:** src/pages/TradingPage.tsx, src/pages/trading/ChartPanel.tsx, AGENT_LOG.md
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **791 passed | 1 skipped** (1 pre-existing
  flaky in `features.test.ts` session-replay cursor timing — fails on clean main too, unrelated) ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅ · PR #34 CI+Deploy গ্রিন,
  লাইভে `hidden md:block` যাচাই হয়েছে (index-CwzZVsCx.js)

## 2026-11-14 — Session 3 · Feature 20: black TradingView theme (user reference)

- **Agent/tool:** OpenCode (GLM) · branch `auto/tv-black-theme` → PR → merge
- **Context:** the user supplied a token extraction from their saved TradingView
  chart page (`jg9IvL4H`) — pure-black platform, `#222222`/`#303030` surfaces,
  `#b8b8b8` text, plus the earlier "pink na, black lagbe". Confirmed via question:
  replace the pastel theme entirely; light mode becomes TradingView's light
  default (white).
- **Plan:** rewrite global.css tokens (dark = the reference black exactly; light =
  TradingView light default — white platform, `#F8F9FD` cards, `#EFF2F5` hover,
  `#E0E3EB` borders, same `#2962FF` interaction); CHART_COLORS dark → black
  canvas `#000000`, text `#787878` (reference `#555555` tertiary reserved for
  disabled — fails AA at normal sizes), grid `#222222`, crosshair label `#303030`;
  light chart → white canvas; theme-color meta + manifest → `#000000`; plum
  stragglers (NewsOverlay surfaces, delta-tooltip chip, drawing text boxes, alert
  stroke) → `#222222`/`#000000`. Blue is the interaction color again (pink gone).
  Candles/order-line unchanged.
- **Recorded assumptions:** reference `radius.md` 8px matches the existing
  `--radius: 0.5rem` (no radius change); typography scale left as-is (12–14px
  components ≈ the reference's 13/14px, avoids a density regression); OHLC/delta
  white chips unchanged (recorded).
- **What changed:** global.css token blocks rewritten (dark = the reference black
  exactly; light = TradingView light default — see DESIGN.TV2.md §2);
  CHART_COLORS dark → black canvas + `crosshairLabelBg` `#303030`, light → white
  canvas; index.html theme-color + manifest colors → `#000000`; NewsOverlay dark
  surfaces → `#222222`, delta-tooltip chip → `#222222`/`#b8b8b8`, drawing
  text-box defaults → `#222222`, alert stroke → `#000000`. OHLC/delta white
  chips unchanged (recorded). DESIGN.TV2.md palette contract rewritten (blue =
  interaction; candles unchanged).
- **Touched files:** src/styles/global.css, src/pages/trading/constants.ts,
  src/pages/trading/NewsOverlay.tsx,
  src/lib/chart-plugins/delta-tooltip/delta-tooltip-pane.ts,
  src/lib/chart-plugins/drawing-tools/renderers.ts, index.html,
  public/manifest.json, DESIGN.TV2.md, AGENT_LOG.md
- **Commit:** `<fill>`
- **Results:** `<fill>`

## 2026-11-14 — Session 3 · Feature 19: mobile chart-only (bottom UI removed)

- **Agent/tool:** OpenCode (GLM) · branch `auto/mobile-chart-only` → PR → merge
- **Request:** the user (screenshot of the mobile bottom strip) asked to remove
  everything below the chart on phones — "no buttons, nothing; only the chart's
  bottom edge remains". Desktop untouched.
- **What changed:** (1) TradingPage.tsx — removed the mobile Sell/Buy action bar
  and the MobileBottomNav (Chart/Orders/Alerts/Trade) render + imports;
  (2) ChartScaleFooter.tsx — root gets `hidden md:block` so the Auto/Log/%·1D…All
  overlay disappears on phones but stays on desktop; (3) BottomPanel.tsx — root
  gets `max-md:hidden` so the Positions/Orders/…/News icon strip (and its
  expand-on-tap behavior) is gone on phones. Kept: MobileAccountBar (top),
  floating chart actions pill (chart top-right), drawing rail + draw sheet,
  long-press crosshair, double-tap fit.
- **Touched files:** src/pages/TradingPage.tsx, src/pages/trading/ChartScaleFooter.tsx,
  src/pages/trading/BottomPanel.tsx, AGENT_LOG.md
- **Commit:** branch `auto/mobile-chart-only` (cherry-picked `43ea824` from shared
  `b498daa`) → squash-merged `23ed5d6` (PR #32, CI + E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **792 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅ · live
  mobile-viewport check: bottom nav / scale footer / sell-buy all absent, chart
  canvas renders ✅

## 2026-11-14 — Session 3 (hotfix): SW cache bump → tv2-v2

- **Agent/tool:** OpenCode (GLM) · branch `auto/sw-cache-bump` → PR #31 → merge
- **Context:** the user reported an empty chart right after the pastel deploy.
  Diagnosed: server + app verified healthy (Playwright, desktop + Pixel 7 mobile
  viewports, zero console errors, Binance REST 200 from the client side; the
  user's SIM reaches `data-api.binance.vision` fine). Likely a long-lived install
  holding stale `tv2-v1` cache entries — the version had never been bumped
  across 18 deploys, so the activate handler never wiped it.
- **What changed:** `public/sw.js` — `CACHE_VERSION` `tv2-v1` → `tv2-v2`; the new
  service worker's activate handler deletes the old cache so every client
  rebuilds from the fresh deploy. No app code touched.
- **Commit:** squash-merged `28fefd6` (PR #31, CI + E2E green); live sw.js serves
  `tv2-v2`
- **Results:** typecheck/lint unchanged (asset-only) · CI ✅ · E2E ✅ · live
  verify `tv2-v2` ✅

## 2026-11-14 — Session 3 · Feature 18: Pastel theme (user template palette)

- **Agent/tool:** OpenCode (GLM) · branch `auto/pastel-theme` → PR → merge
- **Context:** the user shared TradingView's "Advanced Charts starter template
  with custom CSS" (pink/lavender palette) and asked for the whole app in that
  look, light + dark, iterating one-by-one afterwards. The template's CSS vars
  are for TradingView's own charting library (not our code), so the palette was
  translated into our token system.
- **Plan (reviewed first):** (1) rewrite the global.css token blocks — light =
  the template exactly (platform `#d1c4e9` bg, pane `#FBDFF4` cards/chart, pink
  `#F48FB1` interaction, magenta `#88184F`/purple `#4A148C` ink, pink-tint
  borders); dark = deep-plum translation (`#171021` bg, `#241731` cards,
  `#F5DDEF` text, same pink accent); (2) CHART_COLORS dark/light swapped to the
  pastel surfaces (+ new `crosshairLabelBg` field, replacing two hardcoded
  `#2a2e39` crosshair label backgrounds in ChartPanel); (3) manifest +
  theme-color meta → `#171021`; (4) dark surface stragglers (NewsOverlay,
  delta-tooltip chip) → plum; (5) DESIGN.TV2.md palette contract rewritten
  (pink = interaction; candles unchanged). OHLC/delta white chips unchanged
  (recorded assumption). Tests: none reference the old hexes.
- **Recorded assumptions:** the garish demo accents (pure blue/red/magenta
  active states) were softened to the template's pastel identity (pink
  interaction, magenta ink); light-mode buy/sell text darkened for AA on pink;
  the deep-plum dark keeps the same pastel identity rather than copying the
  template's light values into dark (a same-as-light dark mode would break the
  dark-first terminal usage).
- **What changed:** global.css token blocks rewritten (light = template palette
  exactly; dark = deep-plum translation — see DESIGN.TV2.md §2); CHART_COLORS
  dark/light swapped to pastel surfaces with a new `crosshairLabelBg` field
  (replaces 2 hardcoded `#2a2e39` label backgrounds in ChartPanel); index.html
  theme-color + manifest background/theme colors → `#171021`; NewsOverlay dark
  surfaces + delta-tooltip chip → plum. OHLC/delta white chips unchanged
  (recorded). DESIGN.TV2.md palette contract rewritten (pink = interaction,
  candles unchanged).
- **Touched files:** src/styles/global.css, src/pages/trading/constants.ts,
  src/pages/trading/ChartPanel.tsx, src/pages/trading/NewsOverlay.tsx,
  src/lib/chart-plugins/delta-tooltip/delta-tooltip-pane.ts, index.html,
  public/manifest.json, DESIGN.TV2.md, AGENT_LOG.md
- **Commit:** branch `auto/pastel-theme` (cherry-picked `c11b043` from shared `5c02277`) →
  squash-merged `79ddbf1` (PR #30, CI + E2E green); live bundle contains `FBDFF4`
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **792 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅
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

## 2026-11-14 — Session 2 · Feature 12: PWA — offline app shell + update prompt

- **Agent/tool:** OpenCode (GLM) · branch `auto/pwa` → PR → merge
- **Plan (reviewed first):** hand-rolled service worker (no new dependency —
  `vite-plugin-pwa` pulls workbox and fights this repo's injected CSP meta tag): (1)
  **`public/sw.js`** — cache-first for same-origin precache (shell: `/`, icons, fonts,
  manifest) + a runtime cache (stale-while-revalidate) for hashed
  `assets/*`/`fonts/*`; network-first for `api/*`/`ws` untouched (WS never
  intercepted); versioned cache name `tv2-vN` with old-cache cleanup on activate;
  (2) **registration** in `main.tsx` (prod only, `import.meta.env.PROD`, on
  `window.load`, GitHub-Pages-safe scope `/TV2/` via relative register path); (3)
  **update prompt** — `controllerchange` + a detected waiting worker → a small
  toast-style chip "New version available — Reload" (in-app, dismissible, no window
  reload loop: clicking reloads once and the chip state guards re-shows). Manifest
  already exists. CSP: `worker-src 'self'` present via default-src 'self' — verify
  build headers after.
- **Recorded assumptions:** offline = shell + last-loaded JS (SPA re-render from
  cache); market data is never cached (always live); the prompt is a plain component
  not a workbox prompt because there is no workbox.
- **What changed:** `public/sw.js` — hand-rolled worker: precache of the shell
  (`./`, manifest, icons) at install + skipWaiting; activate cleans old `tv2-v*`
  caches + clients.claim; fetch handler: stale-while-revalidate for versioned
  `assets/*`/`fonts/*`, network-first-with-cache-fallback for navigations (offline
  boots the cached shell), cache-first for other same-origin GETs; WS/API/never
  non-GET never intercepted; `SKIP_WAITING` message handler. Registration in
  `main.tsx` (PROD + `window.load` + relative `./sw.js` so the GitHub-Pages scope is
  `/TV2/`; waiting worker → `sw-waiting` window event). New
  `lib/pwa-update.tsx` `PwaUpdateChip` — dismissible "New version available — Reload"
  chip (mounted in `Root`; session-dismiss flag, controllerchange → single reload).
  No new dependency (vite-plugin-pwa/workbox intentionally skipped — CSP meta +
  minimal surface).
- **Touched files:** public/sw.js (new), src/main.tsx, src/Root.tsx,
  src/lib/pwa-update.tsx (new), AGENT_LOG.md
- **Commit:** branch `auto/pwa` (`47ddfe4`) → squash-merged `e43ab3a`
  (PR #24, CI + E2E green); live: sw.js 200 + chip string in bundle
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **780 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅ · dist/sw.js
  emitted ✅

## 2026-11-14 — Session 2 · Feature 14: Keyboard shortcuts pass + dialog focus traps

- **Agent/tool:** OpenCode (GLM) · branch `auto/shortcuts-focus` → PR → merge
- **Plan (reviewed first):** (1) **`hooks/useDialogFocusTrap.ts`** — generic trap:
  on open, focus the dialog container (tabIndex -1); Tab/Shift+Tab wraps within it;
  Escape stays with each dialog's own handler; focus restores to the previously
  focused element on close. Applied to `ChartSettingsDialog` and the three
  `trading-dialogs` modals (OrderConfirm / OrderModify / PositionModify) — the
  audit's a11y gap #6. (2) **Timeframe shortcuts** — a global keydown handler in
  TradingPage: digits 1–9,0 map to the TIMEFRAMES array order (1=1m … 9=4h, 0=1d);
  ignored while typing in an input/textarea/select or with ctrl/meta/alt; mirrors
  the existing Alt+T/H/F/R/M drawing shortcuts.
- **Recorded assumptions:** digit shortcuts are positional over the fixed
  TIMEFRAMES list (TradingView-like "number = timeframe" convention); the trap is
  container-level (no dependency); 1w/1M are reachable via the toolbar, not digits.
- **What changed:** new `hooks/useDialogFocusTrap.ts` — on open: focus moves to the
  dialog container (tabIndex -1), Tab/Shift+Tab wrap within visible focusables
  (capture-phase keydown), on close: focus restores to the trigger. Applied to
  ChartSettingsDialog + OrderConfirm/OrderModify/PositionModify dialogs (hook called
  unconditionally at the top; ref attached to the card). TradingPage: global digit
  shortcuts — 1..9,0 → TIMEFRAMES[0..9] (1m…4h,1d), skipped for input/textarea/
  select/contentEditable targets and modifier combos. Drawing Alt+T/H/F/R/M
  shortcuts already existed in the drawing manager (unchanged).
- **Touched files:** hooks/useDialogFocusTrap.ts (new),
  pages/trading/ChartSettingsDialog.tsx,
  components/trading-dialogs/{OrderConfirm,OrderModify,PositionModify}Dialog.tsx,
  pages/TradingPage.tsx, AGENT_LOG.md
- **Commit:** branch `auto/shortcuts-focus` (`d669af1`) → squash-merged `dd5fdfa`
  (PR #26, CI + E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **780 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅

## 2026-11-14 — Session 2 · Feature 15: Indicator catalog batch 2 (Volume+MA, ADX, CCI, MFI)

- **Agent/tool:** OpenCode (GLM) · branch `auto/indicator-batch2` → PR → merge
- **Plan (reviewed first):** the remaining high-value catalog items from the audit's
  batch-1 scope, wired through the feature-6 instance infra: (1) **VOLUME+MA** — the
  chart already renders a volume histogram when `showVolume` is on; this adds a
  registry-driven "Volume MA" overlay line (SMA of volume, default 20) drawn on the
  chart's own volume price scale when volume is visible, and its own sub-pane when
  not; (2) **ADX(14)** — Wilder's DI+/DI− smoothing, ADX = smoothed DX; renders
  ADX + DI+/DI− lines on a dedicated `adx` pseudo-scale (0..100-ish); (3) **CCI(20)** —
  (TP − SMA(TP)) / (0.015 × mean deviation); dedicated `cci` pseudo-scale;
  (4) **MFI(14)** — typical-price money flow with volume, 0..100 on an `mfi`
  pseudo-scale. All in `lib/indicators.ts` + registry entries with paramSpecs +
  `useIndicators` cases + unit tests in the existing hand-verified style.
- **Recorded assumptions:** ADX uses Wilder smoothing (EMA with α=1/n) exactly as
  the classic definition; CCI constant 0.015; MFI needs volume — falls back to empty
  on feeds without volume (demo/binance have it); Volume MA shares the volume
  histogram's scale when visible (its values are in volume units).
- **What changed:** `lib/indicators.ts` gains 4 calcs — adx (Wilder smoothing,
  ADX + DI+/DI−), cci (TP vs SMA with 0.015 mean-deviation constant), mfi (typical-
  price money flow; empty on volume-less feeds), volumeMa (SMA of the volume series;
  empty without volume). Registry: 4 entries with paramSpecs; IndicatorType now 20
  members. useIndicators: ADX renders ADX + DI+ (#26a69a) + DI− (#ef5350) on an `adx`
  pseudo-scale; CCI/MFI/VOLMA on dedicated `cci`/`mfi`/`volma` pseudo-scales.
  indicators.test.ts: +10 tests (87 total in file).
- **Touched files:** lib/indicators.ts, pages/trading/useIndicators.ts,
  __tests__/indicators.test.ts, AGENT_LOG.md
- **Commit:** branch `auto/indicator-batch2` (`f7d8c19` → rebased `6b625ed`) →
  squash-merged `2ae058b` (PR #27, CI + E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **790 passed | 1 skipped** ✅
  (baseline 780 → 790) · `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within
  budget ✅

## 2026-11-14 — Session 2 · Feature 16: Drawing TV-extras (brush, callout, note, fib channel, favorites toolbar)

- **Agent/tool:** OpenCode (GLM) · branch `auto/draw-extras` → PR → merge
- **Plan (reviewed first):** a pragmatic batch of the audit's TV-extras list (the
  heavier geometric tools — pitchfork/gann/time-zones/regression — deferred, logged):
  (1) **brush** — freehand polyline: pointerdown starts capture, sampled points
  stored as a compressed `points` array on the drawing (`type: "brush"`, renderer =
  polyline through points, hit-test = distance to any segment); (2) **callout** —
  text box anchored at point 1 with a leader line to point 2 (`type: "callout"`,
  reuses text rendering + leader segment, editable via the existing settings
  dialog); (3) **note** — a small sticky-label at point 1 (one-anchor, like
  horizontal but freeform placement, `type: "note"`); (4) **fib channel** — three
  anchors (base line p1→p2 + direction p3), fib-level parallel lines
  (`type: "fibchannel"`, renderer extends the existing fibonacci level math along
  the channel direction); (5) **favorites toolbar** — star a drawing tool
  (`drawing_favorites` persisted list), favorites render as a compact first group in
  the DrawingToolRail. Each new type: DrawingTool/DrawingType union entry,
  buildNew case, renderer, hit-test participation, rail entry.
- **Recorded assumptions:** brush stores ≤200 sampled points (throttled by pointer
  move distance) inline in the drawing object — no schema migration needed since
  DrawingLine tolerates extra fields; callout/note reuse the text editing UX;
  pitchfork/gann/fib time-zones/regression/anchored-VWAP/emoji stay on the backlog
  (heavier math, lower usage).
- **What changed:** 4 new drawing types end-to-end. **brush** (`PencilLine`) —
  freehand polyline stored as a `points` array on DrawingLine (≤200 samples,
  anchors double as endpoints); renderer = polyline, hit = any segment, body-drag
  translates every sample. **callout** (`MessageSquareText`) — text box at p1 +
  arrow leader to p2, editable via the text settings path. **note** (`StickyNote`)
  — one-anchor sticky label. **fibchannel** (`GitFork`) — 3 anchors (base p1→p2 +
  direction p3), FIB_LEVELS rendered as sloped parallel lines (dy·level offset,
  `ResolvedChannelLevel` in resolve.ts), hit = anchors/p3/any level line, body-drag
  = 3-anchor shift (shared with channel). Settings dialog treats callout/note as
  text drawings. **Favorites toolbar**: star per tool in every flyout +
  starred tools render as a compact first group, persisted `drawing_favorites`
  (safeStorage JSON). Rail gained an "Annotations" group.
- **Touched files:** pages/trading/constants.ts, lib/chart-plugins/drawing-tools/
  {types,resolve,manager,renderers,hit-test}.ts, pages/trading/DrawingToolRail.tsx,
  pages/trading/DrawingToolsOverlay.tsx, __tests__/drawExtras.test.ts (new),
  AGENT_LOG.md
- **Commit:** branch `auto/draw-extras` (`088e016` → cherry-picked `e3cad58`) →
  squash-merged `ab91efd` (PR #28, CI + E2E green); live bundle contains
  `drawing_favorites`
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **792 passed | 1 skipped** ✅
  (baseline 790 → 792) · `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within
  budget ✅

## 2026-11-14 — Session 2 · Feature 17 (final): Capacitor Android APK

- **Agent/tool:** OpenCode (GLM) · branch `auto/capacitor-apk` → PR → merge
- **Plan (reviewed first):** wrap the existing SPA in Capacitor (no code change to
  the app): (1) `capacitor.config.ts` — appId `com.ferdausfs.tv2`, appName `TV.2`,
  `webDir: "dist"`, bundled `server: { androidScheme: "https" }`; (2) Capacitor as
  a devDependency (`@capacitor/core @capacitor/cli @capacitor/android`, pinned to
  the current major); (3) **no `android/` folder committed** — it's generated in
  CI via `npx cap add android` so the repo stays clean and gradle never lands in
  git; (4) a **manual-dispatch workflow** `.github/workflows/apk.yml`: npm ci →
  build (VITE_ADAPTER=binance, BASE_PATH="/" — a WebView loads from the device,
  not a sub-path) → `cap add android` → `cap sync` → assemble debug APK → upload
  the artifact; no signing/Play-Store steps (personal-use APK, logged); (5) PWA
  service worker: left as-is — it self-disables effectively in the WebView since
  navigations are network-first and the shell is local (harmless either way,
  assumption logged). Java/Android-SDK absent on both the phone and the VPS, so
  the build runs on GitHub Actions runners (has setup-java + android SDK baked
  in); artifact = debug APK the user can sideload.
- **Recorded assumptions:** debug APK (unsigned for release) is the deliverable;
  appId/company domain chosen from the repo owner; the manifest/SW interplay in a
  WebView is benign; CI builds on ubuntu-latest with Java 21 temurin.
- **What changed:** `capacitor.config.ts` (appId `com.ferdausfs.tv2`, appName
  `TV.2`, webDir `dist`, `androidScheme: "https"`); Capacitor 8.6.2 as devDeps
  (`@capacitor/core|cli|android`) + `cap:sync` npm script; manual-dispatch
  `.github/workflows/apk.yml` — npm ci → `VITE_ADAPTER=binance BASE_PATH=/` build →
  `npx cap add android` (generated in CI, `android/` gitignored — no gradle tree
  in the repo) → `cap sync` → `assembleDebug` (Java 21 temurin) → upload
  `tv2-debug-apk` artifact. No signing/Play steps (personal-use sideload APK).
- **Touched files:** capacitor.config.ts (new), .github/workflows/apk.yml (new),
  package.json, package-lock.json, .gitignore, AGENT_LOG.md
- **Commit:** branch `auto/capacitor-apk` (`6552f58` + lockfile fix `f7f66d2` →
  cherry-picked `bfe4b4e`/`97dd00d`) → squash-merged `374afe7` (PR #29, CI + E2E
  green after fixing npm-ci lockfile sync)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **792 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅ · APK build
  delegated to the manual `Android APK (Capacitor)` workflow (Java/SDK absent on
  phone+VPS — verified config validates)

## 2026-11-14 — Session 2 · Feature 13: Market screener (client-computed, virtualized)

- **Agent/tool:** OpenCode (GLM) · branch `auto/screener` → PR → merge
- **Plan (reviewed first):** a "Screener" right-panel tab (toolbar group + the
  rightPanel union) rendering ALL active symbols with client-computed columns from
  the live tick stream + the symbols meta: price (mid), change% (session ref — same
  first-mid rule as the watchlist), bid/ask spread (abs + bps), day range position
  (0–100% between session low/high tracked in a rolling ref), and volume — skipped:
  no per-symbol volume on the tick stream (column omitted, logged). **Virtualized**:
  windowed rendering (~14 visible rows + overscan 6, absolute scroll offset via
  onScroll) — no dependency, satisfies the audit's "must virtualize" note. Sortable
  headers (name/price/change%/spread), symbol filter input, row click = select
  symbol. 1Hz recompute via a shared interval (no per-tick renders). Mobile: the
  panel is desktop-rail only for now (mobile bottom-sheet integration = follow-up,
  logged).
- **Recorded assumptions:** screener rows compute from the live tick stream only
  (no extra REST sweep per symbol — the demo/binance feeds quote every symbol);
  session low/high accumulate from the same 1Hz sampler (not server stats);
  virtualization = fixed row height (44px) windowing, adequate for ≤ a few
  hundred symbols.
- **What changed:** new `pages/trading/ScreenerPanel.tsx` — full-symbol table with
  live mid, session change% (first-mid reference), spread in bps, and a 0–100 day-range
  position; `useSessionStats` 1Hz sampler accumulates per-symbol ref/low/high and
  publishes immutable snapshots (no per-tick renders). **Virtualized** body: fixed
  44px rows, scroll-offset windowing with overscan 6, ResizeObserver-measured
  viewport — no new dependency. Sortable headers (Symbol/Price/Chg%/Spread), filter
  input (name/category), footer count, row click selects the symbol. Toolbar gains a
  Screener ToolButton (ListFilter); `rightPanel` union + TradingPage rail branch added
  (desktop rail; mobile integration deferred). Volume column intentionally omitted —
  the tick stream carries no per-symbol volume (logged).
- **Touched files:** pages/trading/ScreenerPanel.tsx (new),
  pages/trading/ChartToolbar.tsx, pages/TradingPage.tsx, AGENT_LOG.md
- **Commit:** branch `auto/screener` (`80b5b42`) → squash-merged `32f39f3`
  (PR #25, CI + E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **780 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅

## 2026-11-14 — Session 2 · Feature 10: Screenshot PNG, fullscreen, JSON export/import

- **Agent/tool:** OpenCode (GLM) · branch `auto/export-suite` → PR → merge
- **Plan (reviewed first):** three small chart utilities, all from the chart context
  menu (+ toolbar fullscreen toggle): (1) **Screenshot PNG** — lightweight-charts
  `chart.takeScreenshot()` returns a canvas; composite the legend/status overlays by
  drawing the chart canvas then stamping the symbol/TF text (2× DPR already handled
  by the chart); download via canvas.toBlob + object URL, filename
  `TV2_<SYM>_<TF>_<date>.png`; (2) **Fullscreen** — the chart host div gets
  requestFullscreen with a webkit fallback; ChartPanel tracks
  `document.fullscreenElement` in state for the exit path; (3) **JSON export/import**
  — export the current chart config (chart prefs snapshot via TEMPLATE_PREF_KEYS +
  indicator instances + drawings for the symbol) to a `.json` download; import reads
  a file, validates shape, applies prefs via updateChartPreferences + replaces
  instances + drawings for the current symbol (toast summary). All client-side, no
  adapter change.
- **Recorded assumptions:** screenshot captures the chart canvas area only (overlays
  stamped as plain text, not pixel-perfect); JSON import replaces the current
  symbol's drawings (not all symbols); fullscreen is viewport-level (host div), not
  the whole page.
- **What changed:** new `lib/chart-export.ts` — screenshotChart (takeScreenshot canvas
  + legend text stamp + toBlob download, DPR-aware font sizing), enterFullscreen/
  exitFullscreen (webkit fallback), exportChartConfig (TEMPLATE_PREF_KEYS snapshot +
  indicator instances + drawings → JSON download) and importChartConfig (shape
  validation, prefs applied via updateChartPreferences, instances sanitized, drawings
  cleared-and-pushed through the existing API). Chart context menu: Screenshot (PNG) /
  Toggle fullscreen / Export config / Import config (Camera, Maximize, FileJson,
  FolderOpen icons). ChartPanel wires the handlers + a hidden file input; import
  re-adds drawings via onAddDrawing.
- **Touched files:** lib/chart-export.ts (new), pages/trading/ChartPanel.tsx,
  pages/trading/ChartContextMenu.tsx, AGENT_LOG.md
- **Commit:** branch `auto/export-suite` (`305f20a`) → squash-merged `f412b3d`
  (PR #22, CI + E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **780 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅

## 2026-11-14 — Session 2 · Feature 9: Compare symbol overlay (percentage scale)

- **Agent/tool:** OpenCode (GLM) · branch `auto/compare-overlay` → PR → merge
- **Plan (reviewed first):** TradingView-style **Compare** (overlay another symbol's
  normalized price on the same chart). Scope note: *real resizable sub-panes need a
  pane-separator API — deferred with a logged note; this ships the compare half.*
  Implementation: chart context menu + toolbar get "Compare symbol…" → symbol picker
  (reuses the symbol list); the compare symbol's candles are fetched via `useCandles`
  (same timeframe, modest limit), normalized to % change from its first bar, and drawn
  as a `LineSeries` on an overlay price scale (`priceScaleId: "compare"`, independent
  axis via scaleMargins — no distortion of the main scale). Legend header shows the
  compare symbol + its live % change. State: `compareSymbol` in ChartPanel
  (session-only); context menu "Remove compare" clears it; series re-binds on
  chartEpoch and is removed cleanly on clear.
- **Recorded assumptions:** v1 compare is %-normalized on its own overlay scale
  (TV's overlay look) — price-precise "same axis" mode deferred; compare uses bar
  closes; one compare symbol at a time.
- **What changed:** ChartPanel: `compareSymbol` state + `useCandles(compareSymbol, tf,
  500, enabled)`; compare series = LineSeries on the "compare" overlay price scale
  (gold #f0b90b, % from first loaded close, scaleMargins 0.05/0.05), re-bound on
  chartEpoch, removed on clear/symbol/TF swap (ref nulled in the swap effect).
  Legend header gains a "vs <SYM> ±x.xx%" row with a ✕ remove button (compareChange =
  last/first − 1 from the loaded slice). ChartContextMenu: "Compare symbol…" +
  "Remove compare (SYM)" items (GitCompareArrows icon). New compare picker dialog
  (symbol list, active-only, excludes the main symbol) mounted in ChartPanel;
  `symbols` prop threaded from TradingPage. useCandles gained an `enabled` flag.
- **Touched files:** pages/trading/ChartPanel.tsx, pages/trading/ChartContextMenu.tsx,
  services/queries.ts, pages/TradingPage.tsx, AGENT_LOG.md
- **Commit:** branch `auto/compare-overlay` (`c9ca7bc`) → squash-merged `547cadb`
  (PR #21, CI + E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **780 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅

## 2026-11-14 — Session 2 · Feature 11: Mobile §5.4 — bottom nav, floating action row, draw bottom-sheet, long-press crosshair, double-tap fit

- **Agent/tool:** OpenCode (GLM) · branch `auto/mobile-54` → PR → merge
- **Plan (reviewed first):** complete the mobile shell (audit §Mobile, gaps listed):
  (1) **Bottom nav** (mobile-only, fixed above the action bar): Chart / Orders /
    Alerts / Lists tabs — Chart closes the sheet; the rest open the trading panel
    bottom-sheet on that tab (Orders = positions tab, Lists reuses the alerts sheet
    for now — mobile watchlist logged as a follow-up);
  (2) **Floating action row** — small pill row floating over the chart's top-right:
    Indicators (compact sheet with the same registry list — the desktop toolbar is
    hidden on mobile), Draw (arms the drawing tool → the DrawingToolRail mobile CSS
    already shows), Alert (opens the alerts sheet pre-set to the chart symbol);
  (3) **Draw bottom-sheet** — when a drawing tool is armed on mobile, a compact
    sheet lists the active tool + Undo/Redo/Clear + Done (disarms); reuses the
    drawing callbacks already wired to ChartPanel;
  (4) **Long-press crosshair** — a 350ms touch-hold on the chart shows the
    crosshair + price/time labels (moves with the finger, hides on release) via
    `setCrosshairPosition`/`clearCrosshairPosition`;
  (5) **Double-tap auto-fit** — 300ms double-tap on the chart container calls
    `timeScale.fitContent()` + `scrollToRealTime()`.
  All mobile-only (md:hidden); desktop untouched. No adapter or store-schema change.
- **Recorded assumptions:** Lists tab reuses the Alerts sheet for now (mobile
  watchlist = follow-up); long-press suppresses the browser context menu on the
  chart container only; the floating row hides while a drawing tool is armed (the
  rail takes over).
- **What changed:** new `components/MobileShell.tsx` — `MobileBottomNav` (Chart /
  Orders / Alerts / Trade tabs; in-flow, sits above the sell/buy bar), `MobileChartActions`
  (floating pill: Indicators / Draw / Alert; hides while a tool is armed), `MobileDrawSheet`
  (active tool + Undo/Redo/Clear/Done, anchored above the nav). New
  `hooks/useChartTouchGestures.ts` — 350ms long-press pins the crosshair under the finger
  (`setCrosshairPosition`, follows touchmove, clears on release), 300ms double-tap calls
  `fitContent()` + `scrollToRealTime()`; context menu suppressed while the long-press is
  active. `ChartPanel` instantiates the hook and spreads it on the chart host
  (`chartTouchGestures` prop can override; mobile-only effect). `TradingPage` mounts
  nav/draw-sheet in `md:hidden` blocks and the floating row inside the chart area;
  Indicators/Alert actions open the existing bottom-sheet on the right tab.
  `useChartDrawings` exposes `canUndo`/`canRedo` (historyDepth mirrored on drawings
  change) → terminal context (`canUndoDrawing`/`canRedoDrawing`).
- **Touched files:** components/MobileShell.tsx (new), hooks/useChartTouchGestures.ts
  (new), hooks/useChartDrawings.ts, terminal/context.tsx, terminal/use-terminal.ts,
  pages/trading/ChartPanel.tsx, pages/TradingPage.tsx, AGENT_LOG.md
- **Commit:** branch `auto/mobile-54` (`0572a91`) → squash-merged `cb6435b`
  (PR #23, CI + E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **780 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅
- **Pending/notes:** real resizable sub-panes need a pane API — revisit on
  lightweight-charts upgrade.

## 2026-11-14 — Session 2 · Feature 8: Watchlist v2 — change %, sparklines, drag-reorder, custom lists

- **Agent/tool:** OpenCode (GLM) · branch `auto/watchlist-v2` → PR → merge
- **Plan (reviewed first):** upgrade the GENERIC watchlist (WatchlistPanel.tsx;
  HlWatchlist untouched — it has its own richer UI): (1) **change %** per row — derived
  from the tick stream: session reference = first tick seen after load per symbol →
  `((mid − ref)/ref)×100`, TV green/red; (2) **sparkline** per row — tiny inline SVG
  polyline from a per-symbol rolling price buffer (last ~30 ticks, ref-map, rows
  redraw at 1Hz via a shared interval — no re-render per tick); (3) **drag-reorder**
  of favorites (HTML5 dnd on rows, order persisted in `watchlist_order`); (4) **custom
  lists** — named symbol sets persisted in `watchlist_lists`, chip row next to the
  category chips, add/remove via row actions; (5) change% chip doubles as the colored
  flag. Demo feed already streams every symbol; no adapter change.
- **Recorded assumptions:** session reference = first tick after load (no server
  session anchor in demo); sparkline is a rolling tick buffer, not historical bars
  (cheap, no extra fetches); drag-reorder applies to favorites and custom lists (All
  stays alphabetical); mobile uses the same panel.
- **What changed:** `WatchlistPanel.tsx` (generic) rewritten around two 1Hz hooks —
  `useChangePercent` (session ref = first mid after mount; TV green/red) and
  `useSparklines` (30-point rolling mid buffer published as an immutable snapshot; ref
  map never read during render). Rows now show bid/ask + change% chip + 60×20 SVG
  sparkline. Favorites drag-reorder via HTML5 dnd (`watchlist_order`, missing names
  fall back alphabetically behind the ordered ones). Custom named lists
  (`watchlist_lists`): chip row with delete, row context menu on the star
  (right-click/long-press → "add to list N"), per-row ✕ inside a list view. HlWatchlist
  untouched. All ticks come from the existing feed — no adapter change.
- **Touched files:** pages/trading/WatchlistPanel.tsx, AGENT_LOG.md
- **Commit:** branch `auto/watchlist-v2` (`139760d`) → squash-merged `fe675c0`
  (PR #20, CI + E2E green)
- **Results:** typecheck ✅ · lint --max-warnings=0 ✅ · tests **780 passed | 1 skipped** ✅ ·
  `VITE_ADAPTER=binance` build "✓ built" ✅ · check:size within budget ✅

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
- **Commit:** branch `auto/indicator-batch1` (`ded6cc0`) → squash-merged `4474b55`
  (PR #19, CI + E2E green)
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
