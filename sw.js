// 一平: 初回アクセス時に一式をキャッシュし、以後は完全オフラインで動く
const CACHE = 'ippei-v9';
const FILES = ['./', './index.html', './manifest.json', './icon.svg'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // ignoreSearch: ?demo=1 のようなクエリ付きで開いてもキャッシュに当てる（当たらないとオフラインで開けない）
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(hit => {
    // キャッシュがあれば即返し、裏で取り直して次回起動に反映する（繋がらなければ何もしない）
    // 保存キーはクエリを落とした形に揃える。揃えないと ?demo=1 が別キーに入り、本体が永久に古いままになる
    const key = (() => { const u = new URL(e.request.url); u.search = ''; return u.href; })();
    const fresh = fetch(e.request)
      .then(res => { if (res && res.ok) caches.open(CACHE).then(c => c.put(key, res.clone())); return res; })
      .catch(() => null);
    return hit || fresh.then(r => r || Response.error());
  }));
});
