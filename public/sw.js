// TrailRunner Pro - Service Worker (offline-first)
// Estrategia:
// - Precache de assets estaticos en install
// - Network-first para pages (con fallback a cache)
// - Cache-first para imagenes/fonts/icons
// - No cacheamos /api/* (siempre red)

const VERSION = "v1";
const CACHE_STATIC = `trailrunner-static-${VERSION}`;
const CACHE_RUNTIME = `trailrunner-runtime-${VERSION}`;
const CACHE_PAGES = `trailrunner-pages-${VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-256.png",
  "/icons/icon-384.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // No fallar si algun recurso no esta disponible
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => ![CACHE_STATIC, CACHE_RUNTIME, CACHE_PAGES].includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET
  if (req.method !== "GET") return;

  // No cachear API
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Navegacion (paginas HTML): network-first con fallback offline
  if (req.mode === "navigate" || (req.headers.get("accept") ?? "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_PAGES).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached ?? caches.match("/"))
        )
    );
    return;
  }

  // Assets estaticos (js, css, imagenes, fonts): cache-first
  if (
    url.origin === self.location.origin &&
    /\.(js|css|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|otf|webmanifest)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
          return resp;
        });
      })
    );
    return;
  }

  // Resto: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});