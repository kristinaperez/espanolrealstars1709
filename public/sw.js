/* EspanolReal | CristinaPerez — minimal offline service worker. */

const CACHE = "espanol-real-v2";

const PRECACHE = [
  "/",
  "/learn",
  "/manifest.webmanifest",
  "/icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) return;

  // Cache-first for static assets, network-first for pages.
  const isAsset =
    /\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?|json|webmanifest)$/i.test(
      url.pathname,
    );

  if (isAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();

            caches.open(CACHE).then((cache) => {
              cache.put(request, copy);
            });

            return response;
          }),
      ),
    );

    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();

        caches.open(CACHE).then((cache) => {
          cache.put(request, copy);
        });

        return response;
      })
      .catch(() =>
        caches
          .match(request)
          .then((cached) => cached ?? caches.match("/learn")),
      ),
  );
});