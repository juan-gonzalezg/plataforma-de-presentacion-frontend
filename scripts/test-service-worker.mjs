/**
 * Pruebas del service worker en un contexto aislado de Node.
 * Verifican el enrutamiento de caché sin navegador real.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

let currentFetch = null;

class CacheMock {
  constructor() {
    this.entries = new Map();
  }

  key(request) {
    return typeof request === 'string' ? request : request.url;
  }

  async match(request) {
    return this.entries.get(this.key(request))?.clone();
  }

  async put(request, response) {
    this.entries.set(this.key(request), response.clone());
  }

  async add(url) {
    const response = await currentFetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    this.entries.set(String(url), response.clone());
  }
}

class CacheStorageMock {
  constructor() {
    this.stores = new Map();
  }

  async open(name) {
    if (!this.stores.has(name)) this.stores.set(name, new CacheMock());
    return this.stores.get(name);
  }

  async keys() {
    return [...this.stores.keys()];
  }

  async delete(name) {
    return this.stores.delete(name);
  }

  async match(request) {
    for (const cache of this.stores.values()) {
      const found = await cache.match(request);
      if (found) return found;
    }
    return undefined;
  }
}

const origin = 'https://app.test';
const indexHtml = `<!doctype html>
<html><head>
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="stylesheet" href="/assets/app.css" />
</head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>`;

const caches = new CacheStorageMock();
let networkOnline = true;
let networkRequests = [];

async function fetchMock(input) {
  const url = typeof input === 'string' ? input : input.url;
  networkRequests.push(url);

  if (!networkOnline) {
    throw new TypeError('Failed to fetch');
  }

  if (url === `${origin}/index.html` || url === `${origin}/`) {
    return new Response(indexHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (url === `${origin}/api/topics`) {
    return new Response(JSON.stringify({ topics: [{ id: 'a' }] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url === `${origin}/api/topics/a`) {
    return new Response(JSON.stringify({ topic: { id: 'a' } }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('ok', { status: 200 });
}

currentFetch = fetchMock;

const listeners = new Map();
const self = {
  registration: { scope: `${origin}/` },
  location: new URL(`${origin}/`),
  clients: { claim: async () => undefined },
  skipWaiting: async () => undefined,
  addEventListener: (type, handler) => {
    const current = listeners.get(type) ?? [];
    current.push(handler);
    listeners.set(type, current);
  }
};

const sandbox = {
  self,
  caches,
  fetch: fetchMock,
  Response,
  URL,
  console,
  Promise,
  Set,
  Map,
  Math,
  JSON
};

vm.createContext(sandbox);
const code = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
vm.runInContext(code, sandbox, { filename: 'sw.js' });

async function dispatchLifecycle(type) {
  let waited;
  for (const handler of listeners.get(type) ?? []) {
    handler({ waitUntil: (promise) => (waited = promise) });
  }
  if (waited) await waited;
}

async function dispatchFetch(request) {
  let responded;
  let waited;
  const event = {
    request,
    respondWith: (promise) => (responded = promise),
    waitUntil: (promise) => (waited = promise)
  };

  for (const handler of listeners.get('fetch') ?? []) {
    handler(event);
  }

  if (waited) await waited;
  return responded ? await responded : null;
}

let passed = 0;
async function test(name, run) {
  await run();
  passed += 1;
  console.log(`ok - ${name}`);
}

await dispatchLifecycle('install');
await dispatchLifecycle('activate');

await test('el install guarda el shell y los assets del index', async () => {
  const appCache = await caches.open('presentacion-app-v1');
  assert.ok(await appCache.match(`${origin}/`));
  assert.ok(await appCache.match(`${origin}/index.html`));
  assert.ok(await appCache.match(`${origin}/assets/app.js`));
  assert.ok(await appCache.match(`${origin}/assets/app.css`));
});

await test('la API de módulos usa red y se guarda', async () => {
  networkOnline = true;
  const response = await dispatchFetch({
    method: 'GET',
    mode: 'cors',
    url: `${origin}/api/topics`
  });

  assert.equal(response.status, 200);
  assert.match(await response.text(), /"topics"/);
  assert.ok(await caches.match(`${origin}/api/topics`));
});

await test('sin red devuelve el índice de módulos cacheado', async () => {
  networkOnline = false;
  const response = await dispatchFetch({
    method: 'GET',
    mode: 'cors',
    url: `${origin}/api/topics`
  });

  assert.equal(response.status, 200);
  assert.match(await response.text(), /"topics"/);
});

await test('sin red y sin caché devuelve 503 explicativo', async () => {
  const response = await dispatchFetch({
    method: 'GET',
    mode: 'cors',
    url: `${origin}/api/topics/no-guardado`
  });

  assert.equal(response.status, 503);
  assert.match(await response.text(), /Preparar offline/);
});

await test('la navegación cae al index cacheado sin red', async () => {
  networkOnline = false;
  const response = await dispatchFetch({
    method: 'GET',
    mode: 'navigate',
    url: `${origin}/`
  });

  assert.equal(response.status, 200);
  assert.match(await response.text(), /id="root"/);
});

await test('las descargas no se interceptan ni se cachean', async () => {
  networkOnline = true;
  networkRequests = [];
  const response = await dispatchFetch({
    method: 'GET',
    mode: 'cors',
    url: `${origin}/api/topics/a/download?tipo=pdf`
  });

  assert.equal(response, null);
  assert.deepEqual(networkRequests, []);
});

await test('las peticiones POST del chat no se interceptan', async () => {
  networkRequests = [];
  const response = await dispatchFetch({
    method: 'POST',
    mode: 'cors',
    url: `${origin}/api/chat`
  });

  assert.equal(response, null);
  assert.deepEqual(networkRequests, []);
});

console.log(`\n${passed} pruebas del service worker superadas.`);
