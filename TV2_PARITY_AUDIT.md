# TV2 — TradingView Parity Audit

_Date: 2026-11-13 · Branch: `main` @ `e648b23` · Auditor: agent (OpenCode / GLM)_
_Method: full-source inventory (grep + read) of every area in the master spec §4–§5,
cross-checked against the live site. Master design contract: **DESIGN.TV2.md**
(matches master-prompt §5.2 tokens). The older `DESIGN.md` (Binance palette) is
**superseded** — see Bugs #8._

---

## 1. Repo map

```
src/
  adapter/          OpenChartsAdapter{marketData,trading?,storage?} (types.ts, registry.ts,
                    provider.tsx, conformance.ts, demo.ts) — DataProvider abstraction. Done.
  services/         store.tsx (zustand: useAuthStore, useTradingStore), ws.ts (stream swap),
                    queries.ts (TanStack), schemas.ts (Zod), demo/ (bundled history + replay feed), api/
  terminal/         Terminal.tsx + context.tsx + use-terminal.ts — the app shell + all wiring
  pages/trading/    TradingPage.tsx (layout, panes, mobile shell) · ChartPanel.tsx (2.3k lines:
                    chart core, imperative render pump, legend, drawings integration)
                    ChartToolbar.tsx · ChartPane.tsx (secondary panes) · ChartSettingsDialog.tsx
                    · ChartTemplatesMenu.tsx · ChartContextMenu.tsx · ObjectTreePanel.tsx
                    · DrawingToolRail.tsx / DrawingToolsOverlay.tsx / drawingStyles.ts
                    · BottomPanel.tsx (positions/orders/history/journal/calendar/news)
                    · OrderPanel.tsx · DOMPanel.tsx · WatchlistPanel.tsx · ReplayHUD/ReplayScrubber
                    · useIndicators.ts · constants.ts (TIMEFRAMES, CHART_COLORS, DrawingTool)
  lib/              indicators.ts (8 built-ins, sync main-thread) · chart-plugins/
                    (drawing-tools manager+renderers, delta-tooltip, tooltip) · line-alerts.ts
                    · livePnl.ts · safe-storage.ts
  components/       MobileTradingPanel.tsx (MobileAccountBar, MobileActionBar, order sheet)
                    · TradingDialogs.tsx + trading-dialogs/ (confirm/modify/journal/calculator)
                    · TradingPowerFeatures.tsx · TradingViewWidgets.tsx (calendar/news embeds)
  hyperliquid/      full HL broker adapter + its UI (e2e harness target)
examples/binance-adapter/  the live Binance market-data adapter (built in via VITE_ADAPTER=binance)
e2e/               Playwright, Hyperliquid-mocked (terminal/trading/compliance/fees/onboarding)
```

State: zustand (`useAuthStore`, `useTradingStore`) for auth/accounts/ticks; TanStack Query for
REST; React context (`use-terminal`) for terminal wiring; chart state lives **outside React**
(imperative render pump — do not break).

---

## 2. Parity matrix

### Chart core (spec §4)

| Item | Status | Where / notes |
| --- | --- | --- |
| Candles | **Done** | ChartPanel.tsx:1572 + volume histogram :1599 |
| Bar / Line / Area / Baseline / Line-with-markers / Step | **Missing** | no series switch anywhere (grep zero) |
| Hollow candles / Heikin Ashi | **Missing** | HA is cheap (computed series); hollow needs custom |
| Renko / Range / Kagi / P&F | **Missing** | later — custom models |
| Timeframes 1m…1w | **Partial** | constants.ts:3 — `1m,5m,15m,30m,1h,4h,1d,1w`; missing `3m, 2h, 1M, 1s`, custom interval, favorites |
| Scales (log / percent / invert / lock / auto) | **Missing** | only reset-view (ChartPanel.tsx:1410-1416) |
| Context menu | **Done** | ChartContextMenu.tsx (reset, add alert/order/line) |
| Last-price line + countdown | **Partial** | countdown :1468-1488 (hidden on 1d/1w); bid/ask/mid lines :530-573; `lastValueVisible:false` :1590 → no last-price scale label; no prev-close line, no high/low labels |
| Session breaks / watermark | **Done** | session plugin :299-318; watermark toggle :1548-1555 |
| Range buttons (1D…All) + Go to date | **Missing** | `fitContent` only on reset :624-629 |
| Compare / overlay symbol | **Missing** | one series per chart |
| Indicator sub-panes (resizable) | **Partial** | pseudo-scales `priceScaleId:"rsi"` etc. — overlaid, no real panes/resize/separators |
| Multi-chart layouts 1/2/4/6 + sync | **Partial** | 1/2/4 only (TradingPage.tsx); secondary panes are bare charts (no indicators/replay), no crosshair/time sync |
| Chart settings dialog | **Partial** | ChartSettingsDialog.tsx:36-44 — Appearance/Colors/Trading/Events/Challenge; missing Scales/Timezone/Precision/Session tabs |
| Templates save/load | **Done** | ChartTemplatesMenu.tsx (server-side + autosave) |
| Screenshot PNG / fullscreen | **Missing** | no takeScreenshot/toBlob, no fullscreen |
| JSON export/import of layout | **Missing** | — |

### Indicators (spec §4)

| Item | Status | Notes |
| --- | --- | --- |
| Catalog | **Partial** | 16/27: SMA EMA WMA HMA RSI MACD BOLL Keltner Donchian STOCH StochRSI ATR VWAP OBV W%R ROC (`lib/indicators.ts`). Missing: Supertrend Ichimoku PSAR ADX CCI MFI Volume+MA Volume Profile Pivots |
| Computation | **Partial** | sync on main thread — fine for 8, needs a Worker for profile/ichi-class |
| Settings dialog (Inputs/Style/Visibility) | **Missing** | fixed default params only |
| Menu: categories / search / favorites | **Missing** | plain list (PluginsDropdown, ChartToolbar.tsx) |
| Hide/show/remove + legend rows w/ eye/gear/✕ | **Missing** | no per-indicator legend line at all (ChartLegendHeader shows OHLCV only) |
| Values per layout/template | **Partial** | indicators persist per symbol; not in templates |

### Drawing tools (spec §4)

| Item | Status | Notes |
| --- | --- | --- |
| Core suite | **Done** | 16 tools + none (constants.ts:116-134): trend, ray, extended, h/v line, channel, fib ret/ ext, rect, ellipse, arrow, triangle, text, long/short position, measure |
| Magnet weak/strong, stay-in-draw, lock/hide/z-order, per-TF visibility | **Done** | manager.ts:21, ObjectTreePanel.tsx |
| Persistence + templates + undo/redo | **Done** | `oc_drawings_${symbol}` storage driver; line-cross alerts (toast+sound, session-only) |
| TV extras (pitchfork, gann, fib channel/time-zones/circles, regression, brush, callout, note, signpost, ranges, forecast, anchored VWAP, emoji) | **Missing** | renderer architecture supports adding; batch later |
| Favorites toolbar | **Missing** | — |

### Data / symbols / watchlist / alerts / screener (spec §4)

| Item | Status | Notes |
| --- | --- | --- |
| DataProvider abstraction | **Done** | adapter/types.ts + registry + conformance tests |
| Adapters | **Done** | demo (bundled), hyperliquid (full broker), binance (live, lazy chunk, reconnect+heartbeat — 13 hits in examples/binance-adapter/binance-adapter.ts) |
| Reconnect / offline banner | **Done** | HL ws backoff+jitter+ping/pong; ConnectionIndicator + Stale/Disconnected banners |
| Symbol search chips/recents | **Partial** | text filter + desktop dropdown + mobile fullscreen modal (ChartToolbar.tsx:255-353); watchlist has category chips + favorites; search dialog itself lacks chips/recents |
| Watchlist: multi-lists, flags, drag, sparkline, change% | **Partial** | chips + favorites + bid/ask + one-click B/S (WatchlistPanel.tsx, HlWatchlist.tsx); no multi-lists/drag/sparkline/change% |
| **Alerts: price cross / indicator cross / once-per / expiry / Notification API / list UI** | **Missing** | only drawing-line cross (line-alerts.ts, session-only, toast+beep); mobile Alerts tab is a "coming soon" **stub** (MobileTradingPanel.tsx:403) |
| Screener | **Missing** | — |

### Replay & trading (spec §4)

| Item | Status | Notes |
| --- | --- | --- |
| Replay (play/pause/speed/scrub, multi-day chain, markers) | **Done** | ReplayHUD.tsx, ReplayScrubber.tsx, useReplayPlayback.ts:266-279; missing only a step-forward button |
| Orders market/limit/stop + TP/SL + risk + margin + one-click | **Done** | OrderPanel.tsx |
| Draggable SL/TP lines on chart | **Done** | useSlTpDrag.ts (snap 8px, live P&L label) |
| Positions/orders/history/journal | **Done** | BottomPanel.tsx + tables |
| Bracket/OCO, equity curve | **Missing** | — |

### Platform & UI spec (§5)

| Item | Status | Notes |
| --- | --- | --- |
| **Tokens (§5.2)** | **Broken vs contract** | app ships Binance palette (#0b0e11/#fcd535) but the contract (DESIGN.TV2.md + master §5.2) demands TV palette #131722/#2962FF/#26a69a/#ef5350. Migration = feature 1 |
| Desktop layout (§5.3) | **Partial** | top toolbar / left rail / right rail / bottom panel all exist; missing legend live-dot, fullscreen, screenshot |
| Mobile shell (§5.4) | **Partial** | AccountBar + Sell/Buy ActionBar + bottom-sheet trading + fullscreen search + collapsed BottomPanel — TradingView-app-like (approved); missing: bottom nav, floating Indicators/Draw/Alert row, draw bottom-sheet, long-press crosshair, double-tap auto-fit |
| Tablet (§5.5) | **Partial** | md: breakpoints handle 768–1023 adequately |
| Dialogs (§5.6) | **Partial** | present: Symbol, Indicators(plain), Drawing properties (overlay), Chart Settings, Replay HUD, Layout, Context menu; missing: Alert dialog, Indicator Settings (Inputs/Style/Visibility) |
| States & feedback (§5.7) | **Partial** | buttons/states good; no skeleton shimmer; empty states exist |
| Keyboard (§5.8) | **Partial** | drawing shortcuts Alt+T/H/F/R/M + undo/redo/nudge/clone (manager.ts:33-39); missing Alt+A, `/`, F, Space, Esc-cancel-tool mapping |
| Focus traps in dialogs | **Partial** | only HL TermsDialog + onboarding Modal trap focus |
| PWA (§5 / §4 platform) | **Partial** | manifest + icons ok; **zero service worker** — no offline shell, no update prompt |
| Performance (§5.9) | **Good** | imperative pump (no React per tick), lazy binance chunk, bundle budget check (raw 1250KB/gzip 380KB) green |

---

## 3. Bugs & UX problems

| # | Severity | Where | Problem |
| --- | --- | --- | --- |
| 1 | **High** | MobileTradingPanel.tsx:403 | Mobile "Alerts" tab renders a "coming soon" stub — a promised feature that does nothing |
| 2 | High | ChartPanel.tsx:1590 | `lastValueVisible: false` — the price scale never shows the current price tag (TV always does) |
| 3 | Medium | ChartPanel.tsx:2152 + global.css:86-90 | `drawing-active` class applied but has **no CSS rule** (grep: 1 hit) — the "rail appears only while a tool is armed" intent is dead code; mobile main-chart rail is always visible |
| 4 | Medium | ChartPanel.tsx:1468-1488 | Countdown hidden on 1d/1w — TV shows it on every timeframe |
| 5 | Medium | DESIGN.md vs DESIGN.TV2.md | Two conflicting design contracts in repo (Binance palette vs TV palette). Docs must be reconciled when the theme migrates |
| 6 | Medium | ChartSettingsDialog / trading-dialogs | No focus trap (a11y §5.8) |
| 7 | Low | TradingPage dual/quad | Secondary panes lack indicators/replay — inconsistent parity with main pane |
| 8 | Low | BottomPanel calendar/news | TradingView-embed tabs shown in Hyperliquid mode are filtered, good — but in demo/binance they're mock data (MOCK_EVENTS/MOCK_NEWS) without a "sample data" tag |

---

## 4. Performance risks (mid-range Android)

1. **Indicators sync on main thread** (lib/indicators.ts) — OK for 8 light ones; Volume Profile / Ichimoku / multi-length MA fan would jank. Compute heavy ones in a Web Worker when they land.
2. **No virtualization in the generic watchlist** — fine at <200 rows; screener (if added as a client table) must virtualize.
3. **Drawings redraw** — manager owns a canvas overlay; adding many TV-extra tools must keep dirty-region redraw (verify before batching in 10+ new renderers).
4. **Bundle** — binance adapter already lazy; every new dialog should be code-split; `check:size` budget (gzip 380KB) is the gate.
5. **Tick-driven React renders** — legend/HUD re-render per tick by design (small); keep any new per-tick UI on the same imperative path.

---

## 5. Priority table → ordered roadmap

| P | Feature | Size | Files (main) |
| --- | --- | --- | --- |
| 0 | **Token migration to DESIGN.TV2.md** (TV palette; reconcile docs; manifest/theme-color; kill stray hexes) | M | global.css, constants.ts, 9 hex-bearing files, manifest, DESIGN.md |
| 1 | Mobile Alerts v1 (real price-cross alerts: once/every-time, expiry, toast+sound+Notification, list UI, localStorage persistence) | M | notifications.ts, MobileTradingPanel.tsx (Alerts tab), terminal context |
| 2 | Chart-type selector (line/area/bar/baseline/HA via lightweight-charts built-ins + HA computation) | S-M | ChartPanel.tsx, ChartToolbar.tsx, constants |
| 3 | Price-scale pack: last-price label on, countdown on all TFs, prev-close line, high/low markers | S | ChartPanel.tsx |
| 4 | Scales: log/percent/auto toggles + range buttons (1D…All) + Go-to-date | M | ChartPanel.tsx, ChartContextMenu.tsx |
| 5 | Timeframes: +3m/+2h/+1M(+1s where feed supports) | S | constants.ts, ChartToolbar.tsx |
| 6 | Indicator infra: settings dialog (Inputs/Style/Visibility), menu search/favorites, per-indicator legend rows (eye/gear/✕) | M-L | useIndicators.ts, ChartToolbar.tsx, ChartPanel.tsx |
| 7 | Indicator catalog expansion batch 1 (WMA, HMA, Keltner, Donchian, StochRSI, OBV, W%R, ROC) — **done**; Volume+MA, ADX, CCI, MFI deferred to batch 2 | M | lib/indicators.ts |
| 8 | Watchlist v2: change%, sparkline, drag-reorder, multi-lists, colored flags | M | WatchlistPanel.tsx |
| 9 | Compare/overlay symbol + real sub-panes (resizable) | L | ChartPanel.tsx, ChartPane.tsx |
| 10 | Screenshot + fullscreen + JSON export/import | S | ChartPanel.tsx, ChartContextMenu.tsx |
| 11 | Mobile §5.4 completion: bottom nav, floating action row, draw bottom-sheet, long-press crosshair | L | TradingPage.tsx, new components |
| 12 | PWA service worker (vite-plugin-pwa): offline shell + update prompt | S-M | vite.config, index.html, new sw |
| 13 | Screener (client, virtualized) | M | new |
| 14 | Keyboard shortcuts + focus traps pass | S | various |
| 15 | Advanced indicators batch 2 (Supertrend, Ichimoku, PSAR, Pivot Points, Volume Profile in a Worker) | L | lib/indicators.ts + worker |
| 16 | Drawing TV-extras batch (pitchfork, fib channel/time-zones, brush, callout, note, anchored VWAP, favorites toolbar) | L | drawing-tools |
| 17 | Capacitor Android APK | L | new (last) |

Each item ships alone on its own branch (`auto/<name>`), CI+e2e green on the PR, then merge → main → deploy.

---

## 6. Recommended first feature

**Token migration to DESIGN.TV2.md** — every later UI feature inherits correct colors; doing
it last means re-touching everything. Scope (measured: 33 hardcoded old-hex hits in 9 files):

- `src/styles/global.css` — swap `:root` (dark) + `.light` token values
- `src/pages/trading/constants.ts` — CHART_COLORS dark/light
- stray hexes: delta-tooltip-pane.ts, drawing-tools/renderers.ts, tooltip-element.ts,
  lib/indicators.ts, ChartPanel.tsx, DrawingToolsOverlay.tsx, NewsOverlay.tsx,
  useChallengeLevels.ts (+ MobileTradingPanel momentum colors via tokens — no hexes there)
- `public/manifest.json` + `index.html` — already #131722 ✓ (verify)
- docs: commit DESIGN.TV2.md, turn DESIGN.md into a pointer to it

Assumptions recorded (per master §6): light theme follows master §5.2 light column; in
light mode button fills for buy/sell darken ~15% for WCAG-AA white text while chart candles
stay exactly #26a69a/#ef5350; warning token = #f0b90b restricted to pending-order lines
(DESIGN.TV2.md §2 discipline) rather than the master table's #FF9800.
