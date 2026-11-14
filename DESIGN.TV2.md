# TV.2 — DESIGN.md

The design contract for TV.2, a personal TradingView-grade trading terminal.
Every UI change must comply with this document. Format follows the Stitch
DESIGN.md spec (as catalogued by VoltAgent/awesome-design-md); the working
rules absorb the agency-agents design division's methodology (tokens before
screens, WCAG AA, every state specified, anti-generic finish gate).

**Identity statement**: TV.2 wears the user's pastel template (TradingView
Advanced Charts CSS demo): a lavender platform (`#d1c4e9`), a pink pane
(`#FBDFF4`) for chart + panels, pink interaction (`#F48FB1`), magenta/deep-
purple ink. Dark mode is a deep-plum translation of the same identity
(platform `#171021`, card `#241731`). The candles stay the only loud colors —
teal and red. (This supersedes the original charcoal/blue identity; the user
chose the pastel palette on 2026-11-14.)

---

## 1. Visual Theme & Atmosphere

- **Dark-first** (deep plum). The light pastel theme is the template's exact
  palette and is equally first-class — the user's template shows both.
- **Data-dense**: whitespace budget is spent on the chart, not around it.
- **Flat chrome**: surfaces are separated by 1px borders, not shadows. Depth
  is reserved for floating layers (dropdowns, dialogs, drawing toolbar).
- **Numerals are sacred**: every price, quantity, percentage and timestamp is
  rendered with tabular figures (`tabular-nums`), right-aligned in tables.
- Charts use the TradingView candle palette: up `#26a69a`, down `#ef5350` —
  never Binance yellow-green.

## 2. Color Palette & Roles

Light (the template palette) / dark (plum translation):

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| background | `#d1c4e9` | `#171021` | App platform + (dark) chart canvas |
| card | `#FBDFF4` | `#241731` | Panels, dialogs, tables, light chart canvas |
| secondary | `#F9B9E9` | `#322047` | Hover surfaces, input backgrounds |
| border | pink-tint | `#322047` | 1px separators |
| foreground | `#4A148C` | `#F5DDEF` | Primary text |
| muted-foreground | softened magenta | `#C9A3C0` | Secondary text, labels |
| primary / accent | `#F48FB1` | `#F48FB1` | **Interaction only**: buttons, links, selection, active tool, focus ring |
| up / success / buy | `#087f52` | `#26a69a` | Market direction, profit, long |
| down / destructive / sell | `#c2334a` | `#ef5350` | Market direction, loss, short, danger |
| warning / order-line | `#f0b90b`-family | `#f0b90b` | Pending orders, working lines |
| watermark | `rgba(255,255,255,0.04)` | Chart watermark |

**Color discipline (the rules that keep TV.2 looking intentional):**
- Pink means "you can act on this". Never use it for market state.
- Green/red mean market direction. Never use them for decoration.
- Gold means "waiting to fill". Nothing else.
- Muted magenta/plum for everything that is not currently important.

## 3. Typography Rules

- **Family**: system sans stack for UI; `font-mono` for clocks, HUD readouts
  and IDs. No webfont display faces — a terminal stays fast.
- **Scale (data-dense terminal)**:

| Role | Size | Weight | Notes |
| --- | --- | --- | --- |
| Symbol price header | 16–20px | 700 | tabular-nums |
| Panel titles | 14px | 500 | |
| Controls / buttons | 13px | 500 | |
| Table body | 12px | 400 | tabular-nums, right-aligned numbers |
| HUD / labels / badges | 11px | 400–600 | tabular-nums |
| Watermark | 56px | 400 | 4% white |

- Negative letter-spacing only on the symbol name; never on numerals.

## 4. Component Stylings

- **Toolbars**: 36px rows, 1px `border` separators, `bg-card`. Hover =
  `bg-secondary`. The active drawing tool wears a `bg-primary` pill.
- **Buttons**: radius `6px` (never pill). Primary `#2962FF`/white; secondary
  `bg-secondary`; danger `#ef5350`. Padding 6–10px; icon buttons are square.
- **Inputs/selects**: `bg-input`, 1px `border`, focus ring `#2962FF`
  (`ring-2` at 2px), radius 6px.
- **Tables**: 12px rows, right-aligned tabular numerals, hover
  `bg-secondary/50`, sticky headers on scroll.
- **Dialogs**: `bg-card`, 1px border, `rounded-lg`, `shadow-2xl`; draggable
  by header; Escape always closes; focus trapped.
- **Toasts**: semantic left border (success/up, error/down, warning/gold),
  bottom-right on desktop, top on mobile.
- **States**: every interactive element ships with default / hover /
  active / focus-visible / disabled. A state you can't demo is a bug.

## 5. Layout Principles

- **The chart is the hero**: it always gets the maximum area. Side panels
  280–320px; bottom panel never exceeds 40% of viewport height.
- **Spacing scale**: 4px base (Tailwind default: 1,2,3,4,6,8 units).
- **Desktop grid**: chart left, right rail (order / DOM / watchlist / news),
  bottom panel across. Panels resize by drag with min-heights.
- **Mobile**: one column; pickers become full-screen modals; trading panel is
  a bottom sheet (70vh max) with a drag handle; FAB opens it.

## 6. Depth & Elevation

| Layer | Treatment |
| --- | --- |
| Terminal chrome (toolbars, panels, tables) | Flat + 1px border. No shadow. |
| Dropdowns, popovers | `shadow-xl` |
| Dialogs, floating drawing toolbar | `shadow-2xl` |
| Chart overlays (crosshair labels, price lines) | Solid label chips, no glow |

## 7. Do's and Don'ts

**Do**
- Use tabular-nums for anything numeric; right-align numbers in tables.
- Show the calendar day next to the clock when replaying a past day.
- Keep 44px minimum touch targets on mobile controls.
- Give every tool a visible selected state and every dialog an Escape path.
- Respect reduced-motion; keep animations ≤ 150ms.

**Don't**
- No gradients, no glassmorphism, no decorative illustration.
- No pill buttons; max radius 8px on any control.
- No yellow outside the pending-order meaning; no blue outside interaction.
- Never cover the chart's last 20 price bars with floating UI.
- Never render a number without tabular figures — digits must not dance.

## 8. Responsive Behavior

| Breakpoint | Behavior |
| --- | --- |
| <640px | Single column; full-screen modals; bottom-sheet trading; HUD condenses (select for speed) |
| 640–767px | Bottom sheet still; toolbar wraps |
| 768–1023px | Right rail appears (280px) |
| ≥1024px | Full grid: chart + right rail + bottom panel |
| Touch targets | ≥44px on all touch sizes |

## 9. Agent Prompt Guide

**Quick tokens**: light bg `#d1c4e9` · card/pane `#FBDFF4` · ink `#4A148C`/
`#88184F` · interaction `#F48FB1` · dark bg `#171021` · dark card `#241731` ·
dark text `#F5DDEF` · up `#26a69a` · down `#ef5350` · order `#f0b90b` ·
radius 6px · numerals tabular.

**Design QA checklist (finish gate — run before shipping any UI change):**
1. Tokens only from §2 — no ad-hoc hexes.
2. Contrast ≥ 4.5:1 for text on its surface (WCAG AA).
3. All five interactive states present.
4. Numeric readouts use tabular-nums and stay stable across updates.
5. Nothing blocks the chart's latest bars or the price scale.
6. 44px touch targets at mobile sizes.
7. The change could not be mistaken for another app's UI — it must read as
   TV.2 (charcoal + single blue + teal/red candles only).
