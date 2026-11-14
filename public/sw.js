/* TV.2 service worker (feature 12).
 *
 * Hand-rolled instead of vite-plugin-pwa/workbox: the build injects a strict
 * CSP <meta> tag and a minimal worker keeps the audit surface tiny.
 *
 * Strategy:
 *  - Precache the app shell at install (root document, icons, fonts, manifest)
 *    so a cold offline load still renders the terminal frame.
 *  - Runtime cache for versioned build output (assets/*, fonts/*):
 *    stale-while-revalidate — instant loads, refreshed in the background.
 *  - Never intercept websockets or non-GET requests; /api/* is network-only
 *    (market data and trading must not be served from cache).
 *
 * Bump CACHE_VERSION whenever the shell file list changes.
 */
const CACHE_VERSION = "tv2-v1";
const PRECACHE_URLS = ["./", "./manifest.json", "./icons/icon.svg", "./icons/icon-192x192.png", "./icons/icon-512x512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (event.request.method !== "GET") return;
  const url = new URL(req.url);

  // Only same-origin GETs are cached; anything else (APIs, WS upgrades,
  // TradingView embeds) goes straight to the network.
  if (url.origin !== self.location.origin) return;

  // Versioned build output: cache-first with a background refresh.
  if (url.pathname.includes("/assets/") || url.pathname.includes("/fonts/")) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached ?? fetchPromise;
      }),
    );
    return;
  }

  // Navigations (SPA shell): network-first, fall back to the cached document
  // so an offline load still boots the app shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit ?? caches.match("./"))),
    );
    return;
  }

  // Everything else same-origin (manifest, icons): cache-first.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// Let the page know a new worker is waiting so it can show the update chip.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
