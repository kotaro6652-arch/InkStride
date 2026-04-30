// Inkstride Service Worker
// !! CACHE_VERSION をデプロイのたびに変更すること (例: 日付+バージョン) !!
// 変更すると古いキャッシュが自動削除され、新しいアプリが再キャッシュされる。
// OPFS のギャラリーデータは SW キャッシュとは独立しており、ここでは一切触れない。
const CACHE_VERSION = '2026-04-30-v84-pwa';
const CACHE_NAME = 'inkstride-' + CACHE_VERSION;

// 起動時に必ずキャッシュするファイル（アプリシェル）
const APP_SHELL = [
  './',
  './index.html',
  './sync.html',
  './manifest.json',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
];

// ── インストール: アプリシェルをキャッシュ ──────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting()) // 即座に新しい SW を有効化
  );
});

// ── アクティベート: 古いキャッシュを削除 ────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // 開いているタブをすぐ制御下に
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

  // アプリファイル（同一オリジン）: キャッシュ優先 → なければネットワーク取得してキャッシュ
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok && url.origin === self.location.origin) {
          caches.open(CACHE_NAME).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      }).catch(() => {
        // オフライン時: ナビゲーションは index.html にフォールバック
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('Offline', { status: 503 });
      });
    })
  );
});
