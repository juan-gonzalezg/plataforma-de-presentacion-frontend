/*
 * Service worker de la Plataforma de Presentación Interactiva.
 *
 * Objetivo: que la aplicación y los módulos ya visitados (o preparados con
 * «Preparar offline») sigan abriéndose sin conexión.
 *
 * - Navegación y assets: cache-first para assets con hash, network-first para
 *   el documento HTML.
 * - API de módulos (`/api/topics` y `/api/topics/:id`): network-first con
 *   respaldo en caché. Las descargas y el chat nunca se cachean.
 *
 * El nombre de `API_CACHE` debe coincidir con `OFFLINE_API_CACHE` de
 * `src/lib/offlineCache.ts`.
 */

const CACHE_VERSION = 'v1';
const APP_CACHE = `presentacion-app-${CACHE_VERSION}`;
const API_CACHE = `presentacion-api-${CACHE_VERSION}`;

const OFFLINE_HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sin conexión | Presentación Interactiva</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #020617;
        color: #e2e8f0;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      main {
        max-width: 32rem;
        padding: 2rem;
        text-align: center;
      }
      h1 { font-size: 1.35rem; margin: 0 0 0.75rem; color: #67e8f9; }
      p { line-height: 1.6; color: #94a3b8; margin: 0 0 1rem; }
      code {
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 0.5rem;
        padding: 0.15rem 0.4rem;
        color: #a5f3fc;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Sin conexión</h1>
      <p>
        Esta página todavía no está guardada en el navegador. Vuelve a abrir la
        plataforma con internet y usa <code>Preparar offline</code> para guardar
        los módulos.
      </p>
      <p>La sesión, el chat y las notas adhesivas siguen guardados localmente.</p>
    </main>
  </body>
</html>`;

function isTopicApi(pathname) {
  return (
    pathname === '/api/topics' ||
    /^\/api\/topics\/[^/]+$/.test(pathname)
  );
}

function offlineApiResponse() {
  return new Response(
    JSON.stringify({
      detail:
        'Sin conexión y este módulo no está guardado. Conéctate y usa «Preparar offline» para consultarlo sin internet.'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    }
  );
}

async function precacheAppShell() {
  const cache = await caches.open(APP_CACHE);
  const scope = self.registration.scope;
  const indexUrl = new URL('index.html', scope).href;

  try {
    const response = await fetch(indexUrl, { cache: 'reload' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    await cache.put(indexUrl, response.clone());

    const html = await response.text();
    const discovered = new Set([
      scope,
      indexUrl,
      new URL('manifest.webmanifest', scope).href,
      new URL('icons/icon-192.png', scope).href,
      new URL('icons/icon-512.png', scope).href
    ]);

    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const value = match[1];
      if (!value || value.startsWith('data:') || /^https?:\/\//i.test(value)) {
        continue;
      }
      try {
        discovered.add(new URL(value, indexUrl).href);
      } catch {
        /* referencia inválida: se ignora */
      }
    }

    await Promise.allSettled(
      [...discovered].map((url) => cache.add(url))
    );
  } catch (error) {
    console.warn('[SW] No se pudo precachear la aplicación:', error);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await precacheAppShell();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('presentacion-') &&
              key !== APP_CACHE &&
              key !== API_CACHE
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || offlineApiResponse();
  }
}

async function networkFirstNavigation(request) {
  const scope = self.registration.scope;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(APP_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached =
      (await caches.match(request)) ||
      (await caches.match(new URL('index.html', scope).href)) ||
      (await caches.match(scope));

    if (cached) return cached;

    return new Response(OFFLINE_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Sin conexión' });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // La API de módulos puede vivir en otro origen (VITE_API_BASE_URL).
  if (isTopicApi(url.pathname)) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // El resto de la API (chat, salud, descargas) requiere red.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(cacheFirstStatic(request));
});
