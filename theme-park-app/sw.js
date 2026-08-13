const CACHE = "colas-shell-v2"; // sube este número cada vez que cambien los archivos del shell
const SHELL = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./parks.js",
  "./manifest.json",
  "./icons/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Shell: stale-while-revalidate — sirve la caché al instante pero la refresca en segundo
// plano en cada carga, así la siguiente vez ya hay una versión nueva sin depender de
// acordarnos de subir CACHE a mano. Datos en vivo (API): siempre red, nunca caché.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.hostname.includes("queue-times.com") || url.pathname.startsWith("/api/")) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
