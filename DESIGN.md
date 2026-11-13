# TV.2 — Design Contract (pointer)

**The design contract lives in [`DESIGN.TV2.md`](./DESIGN.TV2.md).** That file is the
single source of truth for tokens, typography, components, layout, and the finish
gate. Every UI change must comply with it.

Identity: charcoal canvas `#131722`, one interaction blue `#2962FF`, candles in
teal `#26a69a` / red `#ef5350`, gold `#f0b90b` reserved for pending orders.
Chart token values live in `src/pages/trading/constants.ts` (`CHART_COLORS`) and
the CSS variable layer in `src/styles/global.css`.

> History: this file previously described the Binance-grade palette
> (`#0b0e11`/`#fcd535`/`#0ecb81`/`#f6465d`). That palette is retired; the
> migration commit (feature 0, `auto/theme-tv-palette`) records the swap.
