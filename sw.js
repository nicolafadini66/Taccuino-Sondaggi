/* Taccuino sondaggi — funzionamento offline: l'app resta sul dispositivo dopo la prima apertura con la rete */
const VER = 'ts-2026-10-27-1940';
const SHELL = ['./', './index.html', './iccd.js', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-180.png'];
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VER);
    await c.addAll(SHELL);
    await Promise.all(CDN.map(u => fetch(u, { mode: 'no-cors' }).then(r => c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VER) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                        // l'archivio (POST) passa sempre dalla rete
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;
  if (url.origin === location.origin) {
    if (url.searchParams.has('verifica')) return;           // controllo aggiornamenti: sempre dalla rete
    // app: prima la rete (così gli aggiornamenti arrivano), poi la copia salvata
    e.respondWith((async () => {
      try {
        // con la rete chiede sempre a GitHub la versione aggiornata (niente copia vecchia della cache del browser)
        const r = await fetch(req, { cache: 'no-cache' });
        if (r.ok) { const c = await caches.open(VER); c.put(req.mode === 'navigate' ? './index.html' : req, r.clone()); }
        return r;
      } catch (x) {
        return (await caches.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
      }
    })());
    return;
  }
  // librerie e caratteri: prima la copia salvata
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    try { const r = await fetch(req); const c = await caches.open(VER); c.put(req, r.clone()); return r; }
    catch (x) { return Response.error(); }
  })());
});
