/**
 * service-worker.js — offline-first caching for أذكاري.
 *
 * Strategy:
 *  - App shell + local data/JS/CSS: precached on install (cache-first).
 *  - Google Fonts (CSS + woff2): cached at runtime (stale-while-revalidate),
 *    so the app keeps its typography fully offline after first load.
 *  - Navigation requests fall back to the cached index.html when offline,
 *    which keeps the hash-routed SPA working with no network.
 *
 * Bump CACHE_VERSION whenever shell assets change to roll the cache.
 */
const CACHE_VERSION = "azkari-v6";
const SHELL_CACHE = CACHE_VERSION + "-shell";
const RUNTIME_CACHE = CACHE_VERSION + "-runtime";

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./browserconfig.xml",
  "./css/styles.css",
  "./js/storage.js",
  "./js/ui.js",
  "./js/prayer-times.js",
  "./js/app.js",
  "./js/pwa-install.js",
  "./js/pages/home.js",
  "./js/pages/adhkar.js",
  "./js/pages/quran.js",
  "./js/pages/tasbeeh.js",
  "./js/pages/settings.js",
  "./data/morning-adhkar.js",
  "./data/evening-adhkar.js",
  "./data/quran-meta.js",
  "./data/quran-data.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-16.png",
  "./icons/favicon-32.png"
];
// iOS splash screens are intentionally NOT precached (large, device-specific);
// the runtime handler caches whichever one a device actually requests.

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k.indexOf(CACHE_VERSION) !== 0)
            .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isFontRequest(url) {
  return url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Google Fonts → stale-while-revalidate in the runtime cache.
  if (isFontRequest(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req).then((res) => {
            if (res && res.status === 200) cache.put(req, res.clone());
            return res;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // SPA navigations → serve index.html offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Same-origin assets → cache-first, then network (and cache the result).
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached || fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }).catch(() => cached)
      )
    );
  }
});
