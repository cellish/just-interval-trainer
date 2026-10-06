/* ハモリ道場 service worker
   方針: ネットにつながっていれば常に最新版を取りに行き(ネットワーク優先)、
   つながらないときだけ端末に保存した版を使う。更新は push するだけで反映される。 */
const CACHE = 'harmony-dojo-v1';
const CORE = ['./', 'index.html', 'listening.html', 'singing.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function withTimeout(p, ms) {
  return new Promise((ok, ng) => { const t = setTimeout(() => ng(new Error('timeout')), ms);
    p.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ng(e); }); });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 自分のページとファイル: ネットワーク優先。ブラウザの HTTP キャッシュも通さず必ずサーバーに確認する
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      try {
        const res = await withTimeout(fetch(new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' })), 5000);
        if (res.ok) { const c = await caches.open(CACHE); c.put(req, res.clone()); }
        return res;
      } catch (err) {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') return (await caches.match('index.html')) || Response.error();
        return Response.error();
      }
    })());
    return;
  }

  // Google Fonts: 保存した版をすぐ使い、裏で更新する
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })());
  }
});
