<div align="center">

# TV.2

**A personal TradingView-grade trading terminal — fast, no-compromise, no subscription.**

Live: https://ferdausfs.github.io/TV2/

</div>

TV.2 is a private terminal built for daily personal use, aiming at feature
parity with the parts of TradingView that matter for real trading:

- **Advanced charting** — candlestick/heikin-ashi/line/area, all timeframes,
  log & percent scales, smooth live streaming (imperative render pump, zero
  React renders per tick).
- **Multi-day bar replay** — TradingView-style replay that chains day after
  day from any chosen date until the current moment, then hands off to live.
- **Live crypto data** — real-time Binance market data (public endpoints,
  no API keys).
- **Paper trading engine** — orders, positions, P&L, equity, ledger.
- **Watchlist, indicators, themes** — dark/light, buy/sell color system,
  self-hosted fonts.

## Roadmap (TradingView parity)

1. Drawing tools — trendlines, fib retracements, shapes, text
2. Screener + price alerts
3. Custom indicators (TypeScript editor)
4. Android app (APK)
5. Forex feeds + multi-chart layouts

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
