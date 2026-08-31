const CACHE_NAME = "dt-site-v6";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./login.html",
  "./story.html",
  "./notes.html",
  "./album.html",
  "./travel.html",
  "./wishes.html",
  "./daily.html",
  "./styles.css",
  "./script.js",
  "./manifest.json",
  "./data/site-state.json",
  "./data/love-lines.md",
  "./assets/pwa-icon-180.png",
  "./assets/pwa-icon-192.png",
  "./assets/pwa-icon-512.png",
  "./assets/china-map.svg",
  "./assets/china-areas.json",
  "./assets/china-region-index.json",
  "./assets/china-svg-map.js",
  "./assets/china-city-index.js",
  "./assets/home-bgm-96.mp3",
  "./assets/story-bgm-96.mp3",
  "./assets/notes-bgm-96.mp3",
  "./assets/album-bgm-96.mp3",
  "./assets/travel-bgm-96.mp3",
  "./assets/wishes-bgm-96.mp3"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if (url.pathname.endsWith("/data/site-state.json") || url.pathname.endsWith("/data/love-lines.md")) {
    event.respondWith(networkFirst(request, request.url));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return await cache.match(request) || await cache.match(fallbackUrl);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetched = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || fetched;
}
