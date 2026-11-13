<div align="center">

# TV.2

**A personal TradingView-grade trading terminal — fast, no-compromise, no subscription.**

Live: https://ferdausfs.github.io/TV2/

</div>

TV.2 is a private terminal built for daily personal use, aiming at feature
parity with the parts of TradingView that matter for real trading. It shares
battle-tested engine internals with its predecessor (the charting pump, live
data and the multi-day replay chain are regression-tested), but is its own
product: own identity, TradingView signature theme (`#131722` / `#2962FF`),
own icon and installable PWA.

## Shipped

- **Advanced charting** — candlestick/heikin-ashi/line/area, all timeframes,
  log & percent scales, smooth live streaming (imperative render pump, zero
  React renders per tick).
- **Drawing tools** — trendline, ray, extended, horizontal/vertical, channel,
  fibonacci retracement & extension, rectangle, ellipse, arrow, triangle,
  text, long/short position tools, measure. Templates, per-type style
  defaults, object tree, undo/redo, line-cross alerts (toast + sound).
- **Multi-day bar replay** — TradingView-style replay that chains day after
  day from any chosen date until the current moment, then hands off to live.
  Date-aware replay clock (shows `02 Nov · 14:23:05` across a day seam).
- **Live crypto data** — real-time Binance market data (public endpoints,
  no API keys).
- **Paper trading engine** — orders, positions, P&L, equity, ledger, journal.
- **PWA** — installable on Android (own icon, standalone display).
- **Watchlist, built-in indicators, themes** — dark/light, buy/sell color
  system, self-hosted fonts.

## Roadmap (TradingView parity)

1. ~~Drawing tools~~ ✅
2. Persistent price alerts (VPS backend + notifications) + crypto screener
3. Custom indicators (TypeScript editor)
4. Forex feeds
5. Multi-chart layouts
6. Android APK (Capacitor)

## Development

```bash
npm install
npm run dev          # local dev server
npm test             # unit suite
npm run typecheck && npm run lint
VITE_ADAPTER=binance npm run build
```

Deploy: push to `main` — GitHub Actions builds with `VITE_ADAPTER=binance`
and publishes to GitHub Pages under `/TV2/`.

## License

MIT — see [LICENSE](LICENSE).
