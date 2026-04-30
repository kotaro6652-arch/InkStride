// Inkstride Service Worker v85
// HTML（index.html / sync.html）はネットワーク優先 → 毎回最新を取得。
// アイコン・manifest 等の静的ファイルはキャッシュ優先。
// OPFS のギャラリーデータは SW キャッシュとは独立しており、ここでは一切触れない。
const CACHE_VERSION = '2026-04-30-v86';
const CACHE_NAME = 'inkstride-' + CACHE_VERSION;

const STATIC_SHELL = [
  './manifest.json',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

// ── インストール: 静的アセットのみキャッシュ ────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(STATIC_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── アクティベート: 古いキャッシュを削除 ────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── フェッチ: リソース種別ごとの戦略 ────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Dropbox API: 常にネットワーク（キャッシュ不可・認証あり）
  if (url.hostname.includes('dropbox')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503, headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Google Fonts: キャッシュ優先 + バックグラウンド更新
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(e.request).then(cached => {
          const net = fetch(e.request).then(r => {
            if (r.ok) cache.put(e.request, r.clone());
            return r;
          }).catch(() => cached || new Response('', { status: 408 }));
          return cached || net;
        })
      )
    );
    return;
  }

  // HTML ナビゲーション（index.html / sync.html）: ネットワーク優先
  // → 常に最新版を取得。オフライン時のみキャッシュにフォールバック。
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp.ok) {
            caches.open(CACHE_NAME).then(c => c.put(e.request, resp.clone()));
          }
          return resp;
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // 静的ファイル（アイコン・manifest 等）: キャッシュ優先 → なければネットワーク
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok && url.origin === self.location.origin) {
          caches.open(CACHE_NAME).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});
