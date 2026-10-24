/**
 * BlueFit service worker (v2)
 *  - Pages and API calls always go to the network (so a new deploy shows up immediately).
 *  - Only immutable build assets and icons are cached.
 *  - If the network is down, a navigation falls back to the cached shell.
 */
const CACHE = "bluefit-v2";
const PRECACHE = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API and other origins: network only

  const immutable = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");
  if (immutable) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
        return res;
      }))
    );
  }
  // everything else (HTML, RSC payloads, JSON): default network behaviour
});
