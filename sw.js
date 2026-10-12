/* 旧URLに残っているサービスワーカーを片付ける。
   保存していたページを消し、自分自身の登録を解除して、開いている画面を読み込み直す(→ 新しいURLへ転送される) */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({type: 'window'})) c.navigate(c.url);
  })());
});
