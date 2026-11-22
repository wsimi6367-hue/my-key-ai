// Service worker de My Key AI : garde l'appli disponible (coquille hors ligne).
// Le chat IA (requêtes POST vers n8n) n'est jamais mis en cache.
const CACHE = "mykeyai-v8";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "css/styles.css",
  "js/app.js", "js/api.js", "js/config.js", "js/geo.js", "js/icons.js", "js/search.js", "js/auth.js", "js/firebase-config.js",
  "img/logo.png", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET") return;
  if (url.origin === location.origin) {
    // Réseau d'abord (mises à jour immédiates), cache si hors ligne.
    e.respondWith(
      fetch(req, { cache: "no-cache" }).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })
        .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
    );
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
  }
});
