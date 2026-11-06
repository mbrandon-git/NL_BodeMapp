/* NL BodeMapp service worker (template: build_web.py fills in VERSION and PRECACHE).
   - App shell (page, libraries, icons): cache first, so the soil profiles work offline.
   - soil.pmtiles: requested with HTTP Range headers, left to the browser (not cached here).
   - Basemap tiles from PDOK: cached as they are seen (at most 400), so places you have looked at work offline. */
const VERSION = "0.5-mobile-be855588";
const SHELL = "nlbm-shell-" + VERSION;
const RUNTIME = "nlbm-runtime-1";
const PRECACHE = ["./", "index.html", "manifest.webmanifest", "vendor/maplibre-gl.js", "vendor/maplibre-gl.css", "vendor/pmtiles.js", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("nlbm-shell-") && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trim(cache, max) {
  const keys = await cache.keys();
  if (keys.length > max) await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
}
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.endsWith(".pmtiles")) return;
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
    return;
  }
  if (url.hostname === "service.pdok.nl") {
    e.respondWith(caches.open(RUNTIME).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { cache.put(req, res.clone()); trim(cache, 400); }
      return res;
    }));
  }
});
