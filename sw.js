const CACHE_NAME = "dt-site-v10";
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

  // 页面导航：网络优先，离线回退到缓存（再退到 index.html）
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  // 代码与标记类资源（HTML / JS / CSS）及数据文件：网络优先。
  // 这样改完代码刷新即生效，不会被旧缓存挡住；离线时自动回退缓存。
  if (isNetworkFirstPath(url.pathname)) {
    event.respondWith(networkFirst(request, request.url));
    return;
  }

  // 图片、音频、图标等静态素材：缓存优先，后台静默更新（省流量、加快首屏）
  event.respondWith(staleWhileRevalidate(request));
});

function isNetworkFirstPath(pathname) {
  if (/\.(?:html|js|css)$/i.test(pathname)) return true;
  if (pathname.endsWith("/data/site-state.json") || pathname.endsWith("/data/love-lines.md")) return true;
  return false;
}

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
