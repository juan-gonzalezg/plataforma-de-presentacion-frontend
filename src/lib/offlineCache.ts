/**
 * offlineCache.ts
 * Preparación explícita del material que puede consultarse sin conexión.
 *
 * El service worker (`public/sw.js`) cachea automáticamente los módulos que se
 * visitan. Este módulo permite además descargar de una vez la lista de temas y
 * el detalle de todos los módulos, y consultar qué hay guardado.
 *
 * La caché se comparte con el service worker mediante el mismo nombre:
 * `presentacion-api-v1`.
 */

import type { TopicMetadata } from '../types';
import { apiUrl } from './apiBase';

/** Debe coincidir con `API_CACHE` de `public/sw.js`. */
export const OFFLINE_API_CACHE = 'presentacion-api-v1';

export const OFFLINE_TOPICS_PATH = '/api/topics';

export interface OfflineCacheInfo {
  /** Módulos con detalle guardado. */
  cached: number;
  /** Módulos consultados. */
  total: number;
  /** La lista de módulos también está guardada. */
  indexCached: boolean;
}

export interface OfflinePreparationFailure {
  id: string;
  error: string;
}

export interface OfflinePreparationResult {
  /** Módulos guardados correctamente (sin contar el índice). */
  cached: number;
  total: number;
  failed: OfflinePreparationFailure[];
}

export interface OfflinePreparationOptions {
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
}

export function supportsOfflineCache(): boolean {
  return typeof caches !== 'undefined';
}

export function topicDetailPath(topicId: string): string {
  return `/api/topics/${encodeURIComponent(topicId)}`;
}

/** Rutas que se guardan: índice de módulos + detalle de cada módulo. */
export function offlineTopicPaths(
  topics: Pick<TopicMetadata, 'id'>[]
): string[] {
  return [
    OFFLINE_TOPICS_PATH,
    ...topics.map((topic) => topicDetailPath(topic.id))
  ];
}

async function cacheResponse(
  cache: Cache,
  path: string,
  response: Response
): Promise<void> {
  if (!response.ok) {
    throw new Error(`El servidor respondió ${response.status}.`);
  }
  await cache.put(apiUrl(path), response.clone());
}

/**
 * Descarga y guarda el índice y el detalle de todos los módulos.
 * Un módulo que falla no cancela el resto: se informa en `failed`.
 */
export async function prepareOfflineCache(
  topics: Pick<TopicMetadata, 'id' | 'title'>[],
  options: OfflinePreparationOptions = {}
): Promise<OfflinePreparationResult> {
  if (!supportsOfflineCache()) {
    throw new Error(
      'Este navegador no admite almacenamiento sin conexión para la aplicación.'
    );
  }

  const cache = await caches.open(OFFLINE_API_CACHE);
  const total = topics.length;
  const failed: OfflinePreparationFailure[] = [];
  let cached = 0;
  let step = 0;
  const totalSteps = topics.length + 1;

  const report = () => options.onProgress?.(step, totalSteps);

  try {
    const indexResponse = await fetch(apiUrl(OFFLINE_TOPICS_PATH), {
      headers: { Accept: 'application/json' },
      signal: options.signal
    });
    await cacheResponse(cache, OFFLINE_TOPICS_PATH, indexResponse);
  } catch (error) {
    if (options.signal?.aborted) throw error;
    failed.push({
      id: 'indice',
      error: error instanceof Error ? error.message : 'No se pudo guardar el índice.'
    });
  }

  step += 1;
  report();

  for (const topic of topics) {
    try {
      const path = topicDetailPath(topic.id);
      const response = await fetch(apiUrl(path), {
        headers: { Accept: 'application/json' },
        signal: options.signal
      });
      await cacheResponse(cache, path, response);
      cached += 1;
    } catch (error) {
      if (options.signal?.aborted) throw error;
      failed.push({
        id: topic.id,
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo guardar el módulo.'
      });
    } finally {
      step += 1;
      report();
    }
  }

  return { cached, total, failed };
}

/** Consulta cuántos módulos hay realmente guardados en la caché. */
export async function getOfflineCacheInfo(
  topics: Pick<TopicMetadata, 'id'>[]
): Promise<OfflineCacheInfo> {
  const info: OfflineCacheInfo = {
    cached: 0,
    total: topics.length,
    indexCached: false
  };

  if (!supportsOfflineCache()) return info;

  const cache = await caches.open(OFFLINE_API_CACHE);
  info.indexCached = Boolean(
    await cache.match(apiUrl(OFFLINE_TOPICS_PATH))
  );

  for (const topic of topics) {
    const response = await cache.match(apiUrl(topicDetailPath(topic.id)));
    if (response) info.cached += 1;
  }

  return info;
}

/** Borra el material guardado sin conexión (no toca la sesión ni el chat). */
export async function clearOfflineCache(): Promise<void> {
  if (!supportsOfflineCache()) return;
  await caches.delete(OFFLINE_API_CACHE);
}
