// ─── THE NATIONS ARE COMING — Service Worker ───
// Version this string any time you update the app content.
// Changing CACHE_NAME forces old caches to be cleared on next visit.
const CACHE_NAME = "nations-coming-v1";

// These are the core files that get cached on first install.
// The app will work offline after the first successful load.
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  // Google Fonts — cached so text renders offline
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap"
];

// ─── INSTALL: cache core assets ───
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Caching core assets");
      // addAll will fail silently per-item if a font URL is blocked —
      // that's fine, text will fall back to system fonts offline.
      return cache.addAll(CORE_ASSETS).catch(err => {
        console.warn("[SW] Some assets failed to cache (non-fatal):", err);
      });
    })
  );
  // Take control immediately without waiting for old SW to expire
  self.skipWaiting();
});

// ─── ACTIVATE: clean up old caches ───
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ─── FETCH: serve from cache, fall back to network ───
// Strategy: Cache First for static assets, Network First for HTML
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST etc. always go to network)
  if (request.method !== "GET") return;

  // Skip browser extension requests
  if (!url.protocol.startsWith("http")) return;

  // HTML pages: Network First (so content updates are seen promptly)
  // Falls back to cache if offline
  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Everything else (JS, CSS, images, fonts): Cache First
  // Returns cached version instantly; fetches update in background
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type === "error") {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      });
    })
  );
});

// ─── PUSH NOTIFICATIONS (future use) ───
// Uncomment when OneSignal or direct push is implemented
// self.addEventListener("push", event => {
//   const data = event.data?.json() ?? {};
//   self.registration.showNotification(data.title || "Nations Are Coming", {
//     body: data.body || "Today's prayer focus is ready.",
//     icon: "/icons/icon-192.png",
//     badge: "/icons/icon-192.png",
//   });
// });
