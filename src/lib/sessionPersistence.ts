/**
 * sessionPersistence.ts
 * Utilidades de serialización para autoguardar la sesión en localStorage.
 *
 * Se mantienen puras (sin importar zustand) para poder probarlas de forma
 * aislada y para que el store solo tenga que declarar la configuración del
 * middleware `persist`.
 *
 * Qué se guarda:
 *  - Módulo seleccionado y lámina actual (para reanudar tras recargar).
 *  - Conversación actual e historial de conversaciones por módulo.
 *  - Bitácora de dudas, sticky notes y fuentes de la última respuesta.
 *  - Foco activo (bloque o página/bbox) y preferencias de tema/tamaño.
 *
 * Qué NO se guarda: estados transitorios (modales abiertos, robot, salud del
 * backend, stream en curso). Al rehidratar se limpian los `isStreaming`.
 */

import type {
  AppView,
  ChatMessage,
  ChatSource,
  ContrastMode,
  FontSizeSetting,
  HighlightBbox,
  QueryResponse,
  StickyNote,
  TopicDetail
} from '../types';

export const SESSION_STORAGE_KEY = 'presentacion-sesion-v1';
export const SESSION_STORAGE_VERSION = 1;

export const MAX_CHAT_MESSAGES = 80;
export const MAX_MODULES_WITH_CHAT = 12;
export const MAX_SESSION_HISTORY = 80;
export const MAX_STICKY_NOTES = 20;
export const MAX_LATEST_SOURCES = 20;

export interface PersistedSession {
  currentView: AppView;
  /** Última vista de trabajo real (home no cuenta), para reanudar donde se estaba. */
  lastActiveView: Exclude<AppView, 'home'>;
  selectedTopic: TopicDetail | null;
  currentSlideIndex: number;
  moduleChats: Record<string, ChatMessage[]>;
  chatMessages: ChatMessage[];
  sessionHistory: QueryResponse[];
  stickyNotes: StickyNote[];
  latestChatSources: ChatSource[];
  activeHighlightBlockId: string | null;
  activeHighlightPage: number | null;
  activeHighlightBbox: HighlightBbox | null;
  contrastMode: ContrastMode;
  fontSize: FontSizeSetting;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Quita el estado de streaming y limita el tamaño del historial. */
export function sanitizeMessages(messages: ChatMessage[] | undefined): ChatMessage[] {
  return (messages ?? [])
    .filter((message) => message && typeof message.text === 'string')
    .slice(-MAX_CHAT_MESSAGES)
    .map((message) =>
      message.isStreaming ? { ...message, isStreaming: false } : message
    );
}

/** Recorta la instantánea antes de escribirla para no agotar la cuota. */
export function persistSessionSnapshot(state: PersistedSession): PersistedSession {
  const moduleEntries = Object.entries(state.moduleChats ?? {}).slice(
    -MAX_MODULES_WITH_CHAT
  );

  return {
    currentView: state.currentView,
    lastActiveView: state.lastActiveView,
    selectedTopic: state.selectedTopic,
    currentSlideIndex: state.currentSlideIndex,
    chatMessages: sanitizeMessages(state.chatMessages),
    moduleChats: Object.fromEntries(
      moduleEntries.map(([id, messages]) => [id, sanitizeMessages(messages)])
    ),
    sessionHistory: (state.sessionHistory ?? []).slice(0, MAX_SESSION_HISTORY),
    stickyNotes: (state.stickyNotes ?? []).slice(0, MAX_STICKY_NOTES),
    latestChatSources: (state.latestChatSources ?? []).slice(-MAX_LATEST_SOURCES),
    activeHighlightBlockId: state.selectedTopic
      ? state.activeHighlightBlockId
      : null,
    activeHighlightPage: state.selectedTopic ? state.activeHighlightPage : null,
    activeHighlightBbox: state.selectedTopic ? state.activeHighlightBbox : null,
    contrastMode: state.contrastMode,
    fontSize: state.fontSize
  };
}

/**
 * Fusiona lo guardado con el estado inicial. Valida que la vista restaurada
 * tenga un módulo y que la lámina siga existiendo; si no, vuelve al Home.
 */
export function mergeSession<T extends PersistedSession>(
  persisted: unknown,
  current: T
): T {
  const snapshot = (persisted ?? {}) as Partial<PersistedSession>;
  const merged = { ...current, ...snapshot } as T;

  merged.chatMessages = sanitizeMessages(merged.chatMessages);
  merged.moduleChats = Object.fromEntries(
    Object.entries(merged.moduleChats ?? {}).map(([id, messages]) => [
      id,
      sanitizeMessages(messages)
    ])
  );
  merged.sessionHistory = merged.sessionHistory ?? [];
  merged.stickyNotes = merged.stickyNotes ?? [];
  merged.latestChatSources = merged.latestChatSources ?? [];

  if (
    merged.lastActiveView !== 'presentation' &&
    merged.lastActiveView !== 'notebooklm'
  ) {
    merged.lastActiveView =
      merged.currentView === 'notebooklm' ? 'notebooklm' : 'presentation';
  }

  if (!merged.selectedTopic) {
    merged.currentView = 'home';
    merged.currentSlideIndex = 0;
    merged.activeHighlightBlockId = null;
    merged.activeHighlightPage = null;
    merged.activeHighlightBbox = null;
    return merged;
  }

  const lastIndex = Math.max(0, (merged.selectedTopic.slides?.length ?? 1) - 1);
  if (
    !Number.isFinite(merged.currentSlideIndex) ||
    merged.currentSlideIndex < 0 ||
    merged.currentSlideIndex > lastIndex
  ) {
    merged.currentSlideIndex = 0;
  }

  // Si la conversación visible quedó vacía pero hay historial del módulo,
  // se recupera al rehidratar.
  if (merged.chatMessages.length === 0) {
    const stored = merged.moduleChats[merged.selectedTopic.id];
    if (stored && stored.length > 0) {
      merged.chatMessages = stored;
    }
  }

  return merged;
}

/**
 * Envuelve localStorage para que un modo privado o una cuota llena no rompan
 * la aplicación: el autoguardado falla en silencio y la sesión sigue viva.
 */
export function createSafeStorage(
  storage: StorageLike | null | undefined
): StorageLike {
  return {
    getItem: (key) => {
      try {
        return storage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      try {
        storage?.setItem(key, value);
      } catch (error) {
        console.warn(
          'No se pudo guardar la sesión (almacenamiento lleno o bloqueado):',
          error
        );
      }
    },
    removeItem: (key) => {
      try {
        storage?.removeItem(key);
      } catch {
        /* sin acción: el borrado es best-effort */
      }
    }
  };
}
