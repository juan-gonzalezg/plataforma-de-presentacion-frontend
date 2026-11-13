/**
 * sessionImport.ts
 * Lectura, validación y restauración del respaldo JSON de la sesión.
 *
 * Igual que la exportación, todo ocurre en el cliente. El respaldo se valida
 * antes de tocar el estado para que un archivo corrupto, de otra versión o con
 * datos incompletos no rompa la sesión en vivo.
 *
 * Se mantiene puro (sin zustand ni DOM) para poder probarlo de forma aislada.
 */

import type {
  AppView,
  ChatMessage,
  ChatSource,
  ContrastMode,
  FontSizeSetting,
  HighlightBbox,
  MaterialFileType,
  QueryResponse,
  Slide,
  StickyNote,
  TopicDetail,
  WebResult
} from '../types';
import {
  MAX_CHAT_MESSAGES,
  MAX_MODULES_WITH_CHAT,
  MAX_SESSION_HISTORY,
  MAX_STICKY_NOTES,
  sanitizeMessages
} from './sessionPersistence';

/** Versión de respaldo que entiende esta aplicación. */
export const BACKUP_SCHEMA_VERSION = 1;

/** Tope defensivo: un respaldo normal pesa mucho menos. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export const CONTRAST_MODES: ContrastMode[] = [
  'cinema-dark',
  'projector-high-contrast',
  'clean-light'
];

export const FONT_SIZES: FontSizeSetting[] = ['normal', 'large', 'xlarge'];

export type ImportMode = 'replace' | 'merge';

export interface SessionBackup {
  app: string;
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  topic: TopicDetail | null;
  config: {
    contrastMode: ContrastMode;
    fontSize: FontSizeSetting;
  };
  chatMessages: ChatMessage[];
  sessionHistory: QueryResponse[];
  stickyNotes: StickyNote[];
}

export interface BackupPreview {
  exportedAt: string;
  topicId: string | null;
  topicTitle: string;
  slides: number;
  chatMessages: number;
  sessionHistory: number;
  stickyNotes: number;
  contrastMode: ContrastMode;
  fontSize: FontSizeSetting;
  warnings: string[];
}

export type ParseBackupResult =
  | { ok: true; backup: SessionBackup; preview: BackupPreview }
  | { ok: false; error: string };

export interface ImportableSessionState {
  selectedTopic: TopicDetail | null;
  currentView: AppView;
  currentSlideIndex: number;
  chatMessages: ChatMessage[];
  moduleChats: Record<string, ChatMessage[]>;
  sessionHistory: QueryResponse[];
  stickyNotes: StickyNote[];
  latestChatSources: ChatSource[];
  activeHighlightBlockId: string | null;
  activeHighlightPage: number | null;
  activeHighlightBbox: HighlightBbox | null;
  contrastMode: ContrastMode;
  fontSize: FontSizeSetting;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function clamp01(value: unknown): number {
  const num = asFiniteNumber(value);
  if (num === null) return 0;
  return Math.min(1, Math.max(0, num));
}

function nonNegative(value: unknown): number {
  const num = asFiniteNumber(value);
  if (num === null) return 0;
  return Math.max(0, Math.round(num));
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function normalizeBbox(value: unknown): HighlightBbox | undefined {
  if (!isRecord(value)) return undefined;
  const x0 = asFiniteNumber(value.x0);
  const top = asFiniteNumber(value.top);
  const x1 = asFiniteNumber(value.x1);
  const bottom = asFiniteNumber(value.bottom);
  if (x0 === null || top === null || x1 === null || bottom === null) {
    return undefined;
  }
  return { x0, top, x1, bottom };
}

function normalizeWebResults(value: unknown): WebResult[] {
  if (!Array.isArray(value)) return [];
  const results: WebResult[] = [];

  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = asString(item.id);
    const title = asString(item.title);
    const url = asString(item.url);
    if (!id || !title || !url) continue;

    results.push({
      id,
      title,
      url,
      snippet: asString(item.snippet) ?? undefined,
      provider: asString(item.provider) ?? undefined
    });
  }

  return results;
}

function normalizeChatSources(value: unknown): ChatSource[] {
  if (!Array.isArray(value)) return [];
  const sources: ChatSource[] = [];

  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = asString(item.id);
    const title = asString(item.title);
    const content = asString(item.content);
    if (!id || !title || content === null) continue;

    sources.push({
      id,
      title,
      content,
      excerpt: asString(item.excerpt) ?? undefined,
      pagina: asFiniteNumber(item.pagina) ?? undefined,
      bbox: normalizeBbox(item.bbox),
      score: asFiniteNumber(item.score) ?? undefined,
      cited: typeof item.cited === 'boolean' ? item.cited : undefined,
      source:
        item.source === 'web' || item.source === 'local'
          ? item.source
          : undefined,
      url: asString(item.url) ?? undefined,
      provider: asString(item.provider) ?? undefined
    });
  }

  return sources;
}

function normalizeSlide(value: unknown, index: number): Slide | null {
  if (!isRecord(value)) return null;

  const title = asString(value.title);
  if (title === null) return null;

  return {
    id: asString(value.id) || `slide-${index + 1}`,
    number: nonNegative(value.number) || index + 1,
    title,
    headline: asString(value.headline) ?? '',
    tag: asString(value.tag) ?? '',
    bullet_points: stringList(value.bullet_points),
    code_snippet: asString(value.code_snippet) ?? undefined,
    highlight_block_ref: asString(value.highlight_block_ref) ?? undefined,
    speaker_notes: asString(value.speaker_notes) ?? undefined
  };
}

function normalizeFiles(value: unknown): Partial<Record<MaterialFileType, string>> | undefined {
  if (!isRecord(value)) return undefined;
  const files: Partial<Record<MaterialFileType, string>> = {};
  const keys: MaterialFileType[] = ['pdf', 'pptx', 'md'];

  for (const key of keys) {
    const path = asString(value[key]);
    if (path) files[key] = path;
  }

  return Object.keys(files).length > 0 ? files : undefined;
}

function normalizeTopic(value: unknown, warnings: string[]): TopicDetail | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id);
  const title = asString(value.title);
  if (!id || !title) {
    warnings.push('El módulo del respaldo no tiene id o título válidos; se omitió.');
    return null;
  }

  const rawSlides = Array.isArray(value.slides) ? value.slides : [];
  const slides = rawSlides
    .map((slide, index) => normalizeSlide(slide, index))
    .filter((slide): slide is Slide => slide !== null);

  if (Array.isArray(value.slides) && slides.length < rawSlides.length) {
    warnings.push(
      `Se omitieron ${rawSlides.length - slides.length} láminas inválidas del respaldo.`
    );
  }

  return {
    id,
    title,
    subtitle: asString(value.subtitle) ?? '',
    category: asString(value.category) ?? 'General',
    slides_count: nonNegative(value.slides_count) || slides.length,
    estimated_minutes: nonNegative(value.estimated_minutes),
    icon: asString(value.icon) ?? 'book',
    tags: stringList(value.tags),
    summary: asString(value.summary) ?? '',
    files: normalizeFiles(value.files),
    is_dynamic: typeof value.is_dynamic === 'boolean' ? value.is_dynamic : undefined,
    slides,
    notes_markdown: asString(value.notes_markdown) ?? undefined
  };
}

function normalizeChatMessage(
  value: unknown,
  index: number
): ChatMessage | null {
  if (!isRecord(value)) return null;

  const sender =
    value.sender === 'user' || value.sender === 'assistant'
      ? value.sender
      : null;
  const text = asString(value.text);
  if (!sender || text === null) return null;

  const source =
    value.source === 'local' ||
    value.source === 'web' ||
    value.source === 'timeout'
      ? value.source
      : undefined;

  return {
    id: asString(value.id) || `imported-msg-${index + 1}`,
    sender,
    text,
    source,
    target_block_id: asString(value.target_block_id) ?? undefined,
    pagina: asFiniteNumber(value.pagina) ?? undefined,
    bbox: normalizeBbox(value.bbox),
    external_url: asString(value.external_url) ?? undefined,
    confidence: asFiniteNumber(value.confidence) ?? undefined,
    timestamp: asString(value.timestamp) ?? '',
    sources: normalizeChatSources(value.sources),
    citations: stringList(value.citations),
    webResults: normalizeWebResults(value.webResults),
    mode:
      value.mode === 'llm' || value.mode === 'extractive'
        ? value.mode
        : undefined,
    isStreaming: false,
    notice: asString(value.notice) ?? undefined,
    error: typeof value.error === 'boolean' ? value.error : undefined
  };
}

function normalizeHistoryEntry(value: unknown): QueryResponse | null {
  if (!isRecord(value)) return null;

  const query = asString(value.query);
  const answer = asString(value.answer_summary);
  if (!query || answer === null) return null;

  const source =
    value.source === 'local' ||
    value.source === 'web' ||
    value.source === 'timeout'
      ? value.source
      : 'local';

  return {
    source,
    target_block_id: asString(value.target_block_id) ?? undefined,
    block_title: asString(value.block_title) ?? undefined,
    answer_summary: answer,
    excerpt: asString(value.excerpt) ?? undefined,
    pagina: asFiniteNumber(value.pagina) ?? undefined,
    bbox: normalizeBbox(value.bbox),
    external_url: asString(value.external_url) ?? undefined,
    web_results: normalizeWebResults(value.web_results),
    provider: asString(value.provider) ?? undefined,
    pending_web: typeof value.pending_web === 'boolean' ? value.pending_web : undefined,
    mode:
      value.mode === 'llm' || value.mode === 'extractive'
        ? value.mode
        : undefined,
    citations: stringList(value.citations),
    confidence: clamp01(value.confidence),
    query,
    latency_ms: nonNegative(value.latency_ms),
    timestamp: asString(value.timestamp) ?? '',
    error: typeof value.error === 'boolean' ? value.error : undefined
  };
}

function normalizeStickyNote(value: unknown, index: number): StickyNote | null {
  if (!isRecord(value)) return null;

  const query = asString(value.query);
  const answer = asString(value.answer);
  if (query === null || answer === null) return null;

  const source =
    value.source === 'local' ||
    value.source === 'web' ||
    value.source === 'timeout'
      ? value.source
      : 'local';

  return {
    id: asString(value.id) || `imported-sticky-${index + 1}`,
    query,
    answer,
    source,
    external_url: asString(value.external_url) ?? undefined,
    web_results: normalizeWebResults(value.web_results),
    provider: asString(value.provider) ?? undefined,
    target_block_id: asString(value.target_block_id) ?? undefined,
    block_title: asString(value.block_title) ?? undefined,
    pending: typeof value.pending === 'boolean' ? value.pending : undefined,
    mode:
      value.mode === 'llm' || value.mode === 'extractive'
        ? value.mode
        : undefined,
    timestamp: asString(value.timestamp) ?? ''
  };
}

function normalizeList<T>(
  value: unknown,
  normalize: (item: unknown, index: number) => T | null,
  warnings: string[],
  label: string
): T[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    warnings.push(`El campo «${label}» no es una lista; se ignoró.`);
    return [];
  }

  const items: T[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = normalize(value[index], index);
    if (item !== null) items.push(item);
  }

  const skipped = value.length - items.length;
  if (skipped > 0) {
    warnings.push(`Se omitieron ${skipped} entradas inválidas de «${label}».`);
  }

  return items;
}

/**
 * Parsea y valida un respaldo. Devuelve un error legible para mostrar en la
 * interfaz o un respaldo normalizado con un resumen para la vista previa.
 */
export function parseSessionBackup(raw: string): ParseBackupResult {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'El archivo está vacío.' };
  }

  if (raw.length > MAX_BACKUP_BYTES) {
    return {
      ok: false,
      error: 'El archivo supera el límite de 5 MB. Selecciona un respaldo más pequeño.'
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      error: 'El archivo no contiene JSON válido. Selecciona un respaldo .json exportado por la plataforma.'
    };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'El respaldo debe ser un objeto JSON.' };
  }

  if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    if (parsed.schemaVersion === undefined) {
      return {
        ok: false,
        error: 'El archivo no parece un respaldo de la plataforma: falta schemaVersion.'
      };
    }
    return {
      ok: false,
      error: `Versión de respaldo no compatible (${String(
        parsed.schemaVersion
      )}). Esta aplicación espera schemaVersion ${BACKUP_SCHEMA_VERSION}.`
    };
  }

  const warnings: string[] = [];
  const app =
    asString(parsed.app) ?? 'Plataforma de Presentación Interactiva';

  if (
    asString(parsed.app) &&
    !(asString(parsed.app) ?? '').toLowerCase().includes('plataforma')
  ) {
    warnings.push('El respaldo fue creado por otra aplicación; se validó igualmente.');
  }

  const topic = normalizeTopic(parsed.topic, warnings);
  if (parsed.topic !== undefined && parsed.topic !== null && !topic) {
    // normalizeTopic ya añadió el detalle; aquí solo aseguramos que exista.
    if (!warnings.some((warning) => warning.includes('módulo del respaldo'))) {
      warnings.push('El módulo del respaldo no se pudo restaurar.');
    }
  }

  const config = isRecord(parsed.config) ? parsed.config : {};
  const contrastMode = CONTRAST_MODES.includes(
    config.contrastMode as ContrastMode
  )
    ? (config.contrastMode as ContrastMode)
    : 'cinema-dark';
  const fontSize = FONT_SIZES.includes(config.fontSize as FontSizeSetting)
    ? (config.fontSize as FontSizeSetting)
    : 'normal';

  if (
    config.contrastMode !== undefined &&
    !CONTRAST_MODES.includes(config.contrastMode as ContrastMode)
  ) {
    warnings.push('El modo de contraste del respaldo no es válido; se usó el predeterminado.');
  }
  if (
    config.fontSize !== undefined &&
    !FONT_SIZES.includes(config.fontSize as FontSizeSetting)
  ) {
    warnings.push('El tamaño de fuente del respaldo no es válido; se usó el predeterminado.');
  }

  const rawChat = normalizeList(
    parsed.chatMessages,
    normalizeChatMessage,
    warnings,
    'conversación'
  );
  const chatMessages = sanitizeMessages(rawChat);
  if (rawChat.length > MAX_CHAT_MESSAGES) {
    warnings.push(
      `La conversación tenía ${rawChat.length} mensajes; se conservaron los últimos ${MAX_CHAT_MESSAGES}.`
    );
  }

  const rawHistory = normalizeList(
    parsed.sessionHistory,
    (item) => normalizeHistoryEntry(item),
    warnings,
    'bitácora'
  );
  const sessionHistory = rawHistory.slice(0, MAX_SESSION_HISTORY);
  if (rawHistory.length > MAX_SESSION_HISTORY) {
    warnings.push(
      `La bitácora tenía ${rawHistory.length} entradas; se conservaron las primeras ${MAX_SESSION_HISTORY}.`
    );
  }

  const rawSticky = normalizeList(
    parsed.stickyNotes,
    normalizeStickyNote,
    warnings,
    'notas adhesivas'
  );
  const stickyNotes = rawSticky.slice(0, MAX_STICKY_NOTES);
  if (rawSticky.length > MAX_STICKY_NOTES) {
    warnings.push(
      `Había ${rawSticky.length} notas adhesivas; se conservaron las primeras ${MAX_STICKY_NOTES}.`
    );
  }

  if (
    !topic &&
    chatMessages.length === 0 &&
    sessionHistory.length === 0 &&
    stickyNotes.length === 0
  ) {
    return {
      ok: false,
      error: 'El respaldo no contiene módulo, conversación, bitácora ni notas que importar.'
    };
  }

  const backup: SessionBackup = {
    app,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: asString(parsed.exportedAt) ?? '',
    topic,
    config: { contrastMode, fontSize },
    chatMessages,
    sessionHistory,
    stickyNotes
  };

  const preview: BackupPreview = {
    exportedAt: backup.exportedAt,
    topicId: topic?.id ?? null,
    topicTitle: topic?.title ?? 'Sin módulo',
    slides: topic?.slides.length ?? 0,
    chatMessages: chatMessages.length,
    sessionHistory: sessionHistory.length,
    stickyNotes: stickyNotes.length,
    contrastMode,
    fontSize,
    warnings
  };

  return { ok: true, backup, preview };
}

function messageKey(message: ChatMessage): string {
  return [
    message.id,
    message.timestamp,
    message.sender,
    message.text
  ].join('::');
}

function historyKey(entry: QueryResponse): string {
  return [entry.timestamp, entry.query, entry.source, entry.answer_summary].join('::');
}

function dedupe<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const itemKey = key(item);
    if (seen.has(itemKey)) continue;
    seen.add(itemKey);
    result.push(item);
  }

  return result;
}

/** Recorta los módulos guardados sin perder el orden de llegada. */
function capModuleChats(
  moduleChats: Record<string, ChatMessage[]>
): Record<string, ChatMessage[]> {
  return Object.fromEntries(
    Object.entries(moduleChats).slice(-MAX_MODULES_WITH_CHAT)
  );
}

function mergeMessages(
  current: ChatMessage[] | undefined,
  imported: ChatMessage[]
): ChatMessage[] {
  return sanitizeMessages(
    dedupe([...(current ?? []), ...imported], messageKey).slice(
      -MAX_CHAT_MESSAGES
    )
  );
}

function historyTime(entry: QueryResponse): number {
  const parsed = Date.parse(entry.timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeHistory(
  current: QueryResponse[],
  imported: QueryResponse[]
): QueryResponse[] {
  return dedupe([...imported, ...current], historyKey)
    .sort((a, b) => historyTime(b) - historyTime(a))
    .slice(0, MAX_SESSION_HISTORY);
}

function mergeStickyNotes(
  current: StickyNote[],
  imported: StickyNote[]
): StickyNote[] {
  return dedupe([...imported, ...current], (note) => note.id).slice(
    0,
    MAX_STICKY_NOTES
  );
}

function latestSources(messages: ChatMessage[]): ChatSource[] {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const sources = messages[index].sources ?? [];
    if (sources.length > 0) return sources.slice(-20);
  }
  return [];
}

/**
 * Construye el estado resultante de importar un respaldo.
 *
 * - `replace`: la sesión actual se sustituye por el respaldo.
 * - `merge`: se conserva la sesión actual y se añaden conversaciones, bitácora
 *   y notas del respaldo. Si no hay módulo activo, se adopta el del respaldo.
 */
export function buildImportedSession(
  current: ImportableSessionState,
  backup: SessionBackup,
  mode: ImportMode
): ImportableSessionState {
  if (mode === 'replace') {
    const topic = backup.topic;
    const chatMessages = topic ? sanitizeMessages(backup.chatMessages) : [];
    const moduleChats =
      topic && chatMessages.length > 0 ? { [topic.id]: chatMessages } : {};

    return {
      selectedTopic: topic,
      currentView: topic ? 'presentation' : 'home',
      currentSlideIndex: 0,
      chatMessages,
      moduleChats,
      sessionHistory: backup.sessionHistory.slice(0, MAX_SESSION_HISTORY),
      stickyNotes: backup.stickyNotes.slice(0, MAX_STICKY_NOTES),
      latestChatSources: latestSources(chatMessages),
      activeHighlightBlockId: null,
      activeHighlightPage: null,
      activeHighlightBbox: null,
      contrastMode: backup.config.contrastMode,
      fontSize: backup.config.fontSize
    };
  }

  const backupTopic = backup.topic;
  const currentTopic = current.selectedTopic;
  const selectedTopic = currentTopic ?? backupTopic;

  const moduleChats: Record<string, ChatMessage[]> = { ...current.moduleChats };
  if (backupTopic && backup.chatMessages.length > 0) {
    moduleChats[backupTopic.id] = mergeMessages(
      moduleChats[backupTopic.id],
      backup.chatMessages
    );
  }

  const sameTopic = Boolean(
    currentTopic && backupTopic && currentTopic.id === backupTopic.id
  );
  let chatMessages = current.chatMessages;
  if (backupTopic && !currentTopic) {
    chatMessages = moduleChats[backupTopic.id] ?? sanitizeMessages(backup.chatMessages);
  } else if (sameTopic) {
    chatMessages =
      moduleChats[backupTopic!.id] ?? current.chatMessages;
  }

  const latestChatSources =
    sameTopic || (!currentTopic && backupTopic)
      ? latestSources(chatMessages)
      : current.latestChatSources;

  const slideCount = selectedTopic?.slides.length ?? 0;
  const currentSlideIndex =
    currentTopic && selectedTopic?.id === currentTopic.id
      ? Math.min(Math.max(0, current.currentSlideIndex), Math.max(0, slideCount - 1))
      : 0;

  return {
    selectedTopic,
    currentView: selectedTopic
      ? currentTopic
        ? current.currentView
        : 'presentation'
      : 'home',
    currentSlideIndex,
    chatMessages,
    moduleChats: capModuleChats(moduleChats),
    sessionHistory: mergeHistory(current.sessionHistory, backup.sessionHistory),
    stickyNotes: mergeStickyNotes(current.stickyNotes, backup.stickyNotes),
    latestChatSources,
    activeHighlightBlockId:
      currentTopic && selectedTopic?.id === currentTopic.id
        ? current.activeHighlightBlockId
        : null,
    activeHighlightPage:
      currentTopic && selectedTopic?.id === currentTopic.id
        ? current.activeHighlightPage
        : null,
    activeHighlightBbox:
      currentTopic && selectedTopic?.id === currentTopic.id
        ? current.activeHighlightBbox
        : null,
    contrastMode: current.contrastMode,
    fontSize: current.fontSize
  };
}
