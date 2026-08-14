const CACHE = "ufc-fantasy-v2";
const STATIC_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/app-icon.svg",
  "/logo-dark.svg",
  "/logo-light.svg",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // non-critical; proceed
      });
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache same-origin GET requests
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Páginas autenticadas nunca entram no cache: evita exibir dados de outra sessão.
  if (request.headers.get("Accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match("/offline.html")),
    );
    return;
  }

  const isStaticAsset =
    STATIC_ASSETS.includes(url.pathname) ||
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(url.pathname);

  // Não armazena payloads RSC nem outras respostas dinâmicas da aplicação.
  if (!isStaticAsset) return;

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    }),
  );
});

// ── Push notifications ──

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "UFC Fantasy";
  const options = {
    body: payload.body || "Tem novidade no app.",
    icon: "/app-icon.svg",
    badge: "/favicon.ico",
    tag: payload.tag || "ufc-fantasy",
    data: {
      url: payload.targetPath || "/home",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/home",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
