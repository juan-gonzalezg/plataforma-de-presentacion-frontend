/**
 * Pruebas de la preparación de material sin conexión.
 * Se ejecutan con esbuild (sin navegador) usando una caché en memoria.
 */

import assert from 'node:assert/strict';
import {
  clearOfflineCache,
  getOfflineCacheInfo,
  OFFLINE_API_CACHE,
  offlineTopicPaths,
  prepareOfflineCache,
  supportsOfflineCache,
  topicDetailPath
} from '../src/lib/offlineCache';

interface CacheLike {
  match(request: string | { url: string }): Promise<Response | undefined>;
  put(request: string | { url: string }, response: Response): Promise<void>;
}

class MemoryCache implements CacheLike {
  readonly entries = new Map<string, Response>();

  private key(request: string | { url: string }): string {
    return typeof request === 'string' ? request : request.url;
  }

  async match(request: string | { url: string }): Promise<Response | undefined> {
    return this.entries.get(this.key(request))?.clone();
  }

  async put(
    request: string | { url: string },
    response: Response
  ): Promise<void> {
    this.entries.set(this.key(request), response.clone());
  }
}

class MemoryCacheStorage {
  readonly caches = new Map<string, MemoryCache>();

  async open(name: string): Promise<MemoryCache> {
    const existing = this.caches.get(name);
    if (existing) return existing;
    const cache = new MemoryCache();
    this.caches.set(name, cache);
    return cache;
  }

  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }
}

const storage = new MemoryCacheStorage();
const originalCaches = (globalThis as { caches?: unknown }).caches;
const originalFetch = globalThis.fetch;

(globalThis as { caches?: unknown }).caches = storage;

let passed = 0;
function test(name: string, run: () => Promise<void> | void) {
  return Promise.resolve(run()).then(() => {
    passed += 1;
    console.log(`ok - ${name}`);
  });
}

async function main() {
  await test('genera rutas codificadas para índice y módulos', () => {
    assert.equal(topicDetailPath('apostol-pedro'), '/api/topics/apostol-pedro');
    assert.equal(
      topicDetailPath('con espacio/ñ'),
      '/api/topics/con%20espacio%2F%C3%B1'
    );
    assert.deepEqual(offlineTopicPaths([{ id: 'a' }, { id: 'b' }]), [
      '/api/topics',
      '/api/topics/a',
      '/api/topics/b'
    ]);
  });

  await test('detecta la Cache API disponible', () => {
    assert.equal(supportsOfflineCache(), true);
  });

  await test('guarda índice y módulos, e informa los que fallan', async () => {
    const requests: string[] = [];
    const progress: Array<[number, number]> = [];

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      if (url === '/api/topics') {
        return new Response(JSON.stringify({ topics: [] }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url === '/api/topics/a') {
        return new Response(JSON.stringify({ topic: { id: 'a' } }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ detail: 'error' }), { status: 500 });
    }) as typeof fetch;

    const result = await prepareOfflineCache(
      [
        { id: 'a', title: 'Módulo A' },
        { id: 'b', title: 'Módulo B' }
      ],
      {
        onProgress: (done, total) => progress.push([done, total])
      }
    );

    assert.equal(result.cached, 1);
    assert.equal(result.total, 2);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].id, 'b');
    assert.deepEqual(requests, ['/api/topics', '/api/topics/a', '/api/topics/b']);
    assert.deepEqual(progress.at(-1), [3, 3]);

    const info = await getOfflineCacheInfo([{ id: 'a' }, { id: 'b' }]);
    assert.equal(info.indexCached, true);
    assert.equal(info.cached, 1);
    assert.equal(info.total, 2);
  });

  await test('el índice queda guardado aunque un módulo falle', async () => {
    const cache = await storage.open(OFFLINE_API_CACHE);
    assert.ok(await cache.match('/api/topics'));
    assert.ok(await cache.match('/api/topics/a'));
    assert.equal(await cache.match('/api/topics/b'), undefined);
  });

  await test('borra solo la caché de módulos', async () => {
    await clearOfflineCache();
    assert.equal(storage.caches.has(OFFLINE_API_CACHE), false);
    const info = await getOfflineCacheInfo([{ id: 'a' }]);
    assert.equal(info.indexCached, false);
    assert.equal(info.cached, 0);
  });

  await test('sin Cache API devuelve un resumen vacío sin romper', async () => {
    (globalThis as { caches?: unknown }).caches = undefined;
    assert.equal(supportsOfflineCache(), false);
    const info = await getOfflineCacheInfo([{ id: 'a' }]);
    assert.deepEqual(info, { cached: 0, total: 1, indexCached: false });
    await assert.rejects(
      prepareOfflineCache([{ id: 'a', title: 'A' }]),
      /no admite almacenamiento sin conexión/
    );
  });

  console.log(`\n${passed} pruebas de modo offline superadas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    (globalThis as { caches?: unknown }).caches = originalCaches;
    globalThis.fetch = originalFetch;
  });
