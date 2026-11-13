---
version: 2
name: TV.2-design-contract
description: A dense, professional trading terminal on a near-black canvas (#0B0E11) with a single brand accent — TV.2 Yellow (#FCD535) — carrying every primary action and the brand mark. Numbers render in JetBrains Mono with tabular figures; UI text in Inter. Trading green (#0ECB81) and red (#F6465D) are reserved exclusively for price-direction semantics. Flat color-block surfaces separated by hairlines (#2B3139), never shadows or gradients. WCAG AA is enforced even where consumer platforms skip it — button text on green/red/yellow is ink (#181A20), not white.

colors:
  canvas-dark: "#0b0e11"
  surface-card-dark: "#1e2329"
  surface-elevated-dark: "#2b3139"
  hairline-dark: "#2b3139"
  canvas-light: "#ffffff"
  surface-soft-light: "#f5f5f5"
  hairline-light: "#eaecef"
  primary: "#fcd535"
  primary-active: "#f0b90b"
  primary-disabled: "#3a3a1f"
  on-primary: "#181a20"
  ink: "#181a20"
  body-on-dark: "#eaecef"
  muted: "#929aa5"
  muted-quiet: "#707a8a"
  trading-up: "#0ecb81"
  trading-down: "#f6465d"
  trading-up-on-light: "#0a9963"
  trading-down-on-light: "#d43a4d"
  info-focus-ring: "#3b82f6"
  order-line: "#f0b90b"

typography:
  ui: "Inter, system-ui, -apple-system, sans-serif — 13px base, body 400, titles 600, small caps labels 10-11px tracking-wider"
  numbers: "JetBrains Mono, monospace — every price, PnL, percentage, quantity; tabular-nums always"
  scale: "price/legend 12-13px mono 590; panel titles 11-12px 600; stat values 14-16px mono 600; hero stat 20-24px mono 700"

rounded:
  button: 6px
  input: 8px
  card: 8px
  elevated: 12px
  pill: 9999px

spacing:
  base: 4px scale
  panel-padding: 8-12px (terminals are dense; no 24px card padding inside panels)
  toolbar-height: 40-44px
  touch-target: 44px min-height on mobile

---

## 1. Identity

TV.2 reads as a professional exchange terminal in the Binance/TradingView class: **near-black canvas** (`#0B0E11`), white-gray type, **one accent** — TV.2 Yellow (`#FCD535`) — and strict **green/red trading semantics**. The accent is scarce: primary CTAs, the TV.2 wordmark, active states, focus-visible moments. Everything else is neutral. Depth comes from surface steps (canvas → card → elevated), never shadows, never glass, never gradients.

This contract intentionally exceeds the reference platforms in one place: **contrast**. White text on green/red (2.1:1, 3.5:1) is common in exchanges but fails WCAG AA — TV.2 uses ink (#181A20) on all solid green/red/yellow fills (8.2:1, 4.9:1, 12.2:1).

## 2. Color Roles

| Token | Dark | Light | Use |
|---|---|---|---|
| background | #0b0e11 | #ffffff | Page + chart canvas |
| card | #1e2329 | #ffffff | Panels, dialogs, tables |
| secondary / elevated | #2b3139 | #f5f5f5 | Hover fills, inputs, nested chips |
| border (hairline) | #2b3139 | #eaecef | All 1px separators — liberally |
| foreground | #eaecef | #181a20 | Running text |
| muted-foreground | #929aa5 | #707a8a-family | Labels, captions (AA-checked) |
| primary | #fcd535 | #fcd535 | Primary CTA bg, brand mark, active tab, glow |
| on-primary / ink | #181a20 | #181a20 | Text on yellow/green/red fills |
| buy / success | #0ecb81 | #0a9963 | Long, bid, profit, filled |
| sell / destructive | #f6465d | #d43a4d | Short, ask, loss, danger |
| ring | #3b82f6 | #3b82f6 | Keyboard focus ring |
| order-line | #f0b90b | #b8860b | Pending-order price lines on chart |

Rules:
- Yellow never colors body text or large surfaces — focal CTAs and the wordmark only.
- Green/red are price-direction signals only: text color, thin lines, small badge fills. Never generic success/error decoration, never card backgrounds.
- A "profit" text cell = green; a "Buy" button = solid green with ink text. Same hue, two jobs, both allowed.
- Chart palette (CHART_COLORS) mirrors these tokens exactly; the chart canvas and --background are the same color so panels and chart read as one surface.

## 3. Typography

- **Inter** for all UI copy (already self-hosted, variable weight).
- **JetBrains Mono** for every number the trader acts on: prices, PnL, quantities, percentages, clock, countdown. `tabular-nums` everywhere digits update live.
- Labels small-caps at 10-11px with wider tracking; panel titles 11-12px/600; never below 10px.
- Weight discipline: 400 body, 600 titles/buttons, 700 reserved for hero numbers and the wordmark.

## 4. Components

- **Primary CTA** — yellow bg, ink text, 6px radius, 600 weight. One per view region.
- **Buy / Sell** — solid green / red, ink text, 6px radius. Side-by-side pairs (Buy | Sell) with equal width.
- **Secondary button** — elevated surface fill (#2b3139), body text, hairline border, 6px radius.
- **Ghost / toolbar button** — transparent, muted text; active = yellow text or yellow underline (2px).
- **Inputs** — elevated fill on dark / hairline on light, 8px radius, blue focus ring (`ring-accent` replaced by `ring` token on :focus-visible only).
- **Tables / watchlists** — hairline row dividers, mono numbers right-aligned, direction cells in green/red text with ▲/▼.
- **Panels** — flat card fill + hairline border; headers share the card fill with a hairline beneath (uppercase 11px muted label).
- **Active tab** — yellow 2px underline + foreground text; inactive muted.
- **Live pulse dot** — green with `live-pulse` animation; connection states use green/red/amber only.
- **Toasts** — card fill, hairline border, 12px radius, direction-colored left edge when trade-related.

## 5. Layout

- Dense 4px-base spacing; panels pad 8-12px, gutters 4-8px. Whitespace is uniform, not generous.
- Toolbar 40-44px; multi-chart grids separate panes with 1px `bg-border` gaps.
- Mobile: 44px min tap targets, bottom sheets rounded 16px top, safe-area insets respected.

## 6. Do

- Use token classes (`bg-card`, `text-muted-foreground`, `bg-buy`) — never raw hex in components.
- Right-align every numeric column; use `.stat-value` for stat blocks.
- Keep chart overlays (bid/ask/position/TP-SL lines) in the semantic colors above.
- Test both themes after any token change.

## 7. Don't

- No shadows on panels, no glassmorphism, no gradient surfaces, no glow except the `--glow` text accents.
- No white text on green/red/yellow fills (AA violation).
- No second brand color (no purple, no turquoise).
- No weight-400 display headlines — terminals read at a glance.
- Never repurpose green/red for non-trading semantics.

## 8. Finish Gate (every UI change)

1. `npm run typecheck && npm run lint` — zero errors/warnings.
2. Both themes visually checked (dark + light toggle).
3. All numbers mono + tabular; no CLS from font swap.
4. Contrast: muted text ≥ 4.5:1, UI graphics ≥ 3:1.
5. Touch targets ≥ 44px on mobile; focus-visible ring present.
6. Old palette hexes (`#131722`, `#2962FF`, `#26a69a`, `#ef5350`, `#1e222d`, `#363a45`, `#7586a3`, `#b2b5be`, `#787B86`) — grep count must be 0 in src/.
