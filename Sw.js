const C = "hostellink-v2";
const FILES = ["./", "index.html", "styles.css", "app.js", "manifest.json", "icon.svg", "hero.jpg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => Promise.allSettled(FILES.map(f => c.add(f)))).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); return res; }).catch(() => caches.match(r)));
});