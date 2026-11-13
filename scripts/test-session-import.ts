/**
 * Pruebas puras de la importación del respaldo JSON.
 * Se ejecutan con esbuild (sin navegador) y no forman parte del build.
 */

import assert from 'node:assert/strict';
import {
  buildImportedSession,
  MAX_BACKUP_BYTES,
  parseSessionBackup,
  type ImportableSessionState,
  type SessionBackup
} from '../src/lib/sessionImport';
import { buildSessionBackup } from '../src/lib/sessionExport';
import type {
  ChatMessage,
  QueryResponse,
  StickyNote,
  TopicDetail
} from '../src/types';

function makeTopic(id = 'apostol-pedro', slides = 3): TopicDetail {
  return {
    id,
    title: `Módulo ${id}`,
    subtitle: 'Subtítulo',
    category: 'Apóstoles',
    slides_count: slides,
    estimated_minutes: 45,
    icon: 'book',
    tags: ['historia'],
    summary: 'Resumen del módulo',
    slides: Array.from({ length: slides }, (_, index) => ({
      id: `slide-${index + 1}`,
      number: index + 1,
      title: `Lámina ${index + 1}`,
      headline: `Idea ${index + 1}`,
      tag: 'Clave',
      bullet_points: ['Punto uno', 'Punto dos']
    }))
  };
}

function message(id: string, text = `Mensaje ${id}`, sender: 'user' | 'assistant' = 'user'): ChatMessage {
  return {
    id,
    sender,
    text,
    timestamp: '2026-11-10T10:00:00.000Z'
  };
}

function historyEntry(index: number): QueryResponse {
  return {
    source: index % 2 === 0 ? 'local' : 'web',
    query: `¿Pregunta ${index}?`,
    answer_summary: `Respuesta ${index}`,
    confidence: 0.8,
    latency_ms: 120 + index,
    timestamp: `2026-11-10T10:${String(index % 60).padStart(2, '0')}:00.000Z`
  };
}

function sticky(id: string): StickyNote {
  return {
    id,
    query: `¿Nota ${id}?`,
    answer: 'Respuesta de la nota',
    source: 'local',
    timestamp: '2026-11-10T10:00:00.000Z'
  };
}

function backup(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    app: 'Plataforma de Presentación Interactiva',
    schemaVersion: 1,
    exportedAt: '2026-11-10T10:00:00.000Z',
    topic: makeTopic(),
    config: { contrastMode: 'cinema-dark', fontSize: 'normal' },
    chatMessages: [message('m1'), message('m2')],
    sessionHistory: [historyEntry(1), historyEntry(2)],
    stickyNotes: [sticky('s1')],
    ...overrides
  };
}

function parse(raw: Record<string, unknown>) {
  return parseSessionBackup(JSON.stringify(raw));
}

function assertOk(result: ReturnType<typeof parseSessionBackup>) {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error);
  return result;
}

function emptyState(overrides: Partial<ImportableSessionState> = {}): ImportableSessionState {
  return {
    selectedTopic: null,
    currentView: 'home',
    currentSlideIndex: 0,
    chatMessages: [],
    moduleChats: {},
    sessionHistory: [],
    stickyNotes: [],
    latestChatSources: [],
    activeHighlightBlockId: null,
    activeHighlightPage: null,
    activeHighlightBbox: null,
    contrastMode: 'cinema-dark',
    fontSize: 'normal',
    ...overrides
  };
}

let passed = 0;
function test(name: string, run: () => void) {
  run();
  passed += 1;
  console.log(`ok - ${name}`);
}

test('parsea un respaldo válido y genera la vista previa', () => {
  const result = assertOk(parse(backup()));
  assert.equal(result.preview.topicId, 'apostol-pedro');
  assert.equal(result.preview.topicTitle, 'Módulo apostol-pedro');
  assert.equal(result.preview.slides, 3);
  assert.equal(result.preview.chatMessages, 2);
  assert.equal(result.preview.sessionHistory, 2);
  assert.equal(result.preview.stickyNotes, 1);
  assert.deepEqual(result.preview.warnings, []);
  assert.equal(result.backup.schemaVersion, 1);
});

test('rechaza JSON inválido', () => {
  const result = parseSessionBackup('{no es json');
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /JSON válido/);
});

test('rechaza archivos que superan el tamaño máximo', () => {
  const result = parseSessionBackup('x'.repeat(MAX_BACKUP_BYTES + 1));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /5 MB/);
});

test('acepta el respaldo generado por la exportación real', () => {
  const raw = buildSessionBackup({
    topic: makeTopic('apostol-andres'),
    chatMessages: [message('m1'), message('m2', 'Respuesta', 'assistant')],
    sessionHistory: [historyEntry(1)],
    stickyNotes: [sticky('s1')],
    contrastMode: 'clean-light',
    fontSize: 'large'
  });

  const result = assertOk(parseSessionBackup(raw));
  assert.equal(result.preview.topicId, 'apostol-andres');
  assert.equal(result.preview.chatMessages, 2);
  assert.equal(result.preview.sessionHistory, 1);
  assert.equal(result.preview.stickyNotes, 1);
  assert.equal(result.backup.config.contrastMode, 'clean-light');
  assert.equal(result.backup.config.fontSize, 'large');
});

test('rechaza una versión de esquema desconocida', () => {
  const result = parse(backup({ schemaVersion: 2 }));
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /no compatible/);
});

test('rechaza un respaldo sin datos restaurables', () => {
  const result = parse(
    backup({
      topic: null,
      chatMessages: [],
      sessionHistory: [],
      stickyNotes: []
    })
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /no contiene/);
});

test('tolera módulo inválido y recorta los datos que sí existen', () => {
  const result = assertOk(parse(backup({ topic: { id: 'sin-titulo' } })));
  assert.equal(result.backup.topic, null);
  assert.ok(result.preview.warnings.some((warning) => warning.includes('módulo')));
});

test('recorta conversación, bitácora y notas a los límites de sesión', () => {
  const messages = Array.from({ length: 100 }, (_, index) => message(`m${index}`));
  const history = Array.from({ length: 100 }, (_, index) => historyEntry(index));
  const notes = Array.from({ length: 30 }, (_, index) => sticky(`s${index}`));
  const result = assertOk(
    parse(
      backup({
        chatMessages: messages,
        sessionHistory: history,
        stickyNotes: notes
      })
    )
  );

  assert.equal(result.backup.chatMessages.length, 80);
  assert.equal(result.backup.sessionHistory.length, 80);
  assert.equal(result.backup.stickyNotes.length, 20);
  assert.equal(result.backup.chatMessages[0].id, 'm20');
  assert.ok(result.preview.warnings.some((warning) => warning.includes('últimos 80')));
});

test('limpia mensajes que quedaron en streaming y valida su forma', () => {
  const result = assertOk(
    parse(
      backup({
        chatMessages: [
          { ...message('valido'), isStreaming: true },
          { id: 'roto', sender: 'user' }
        ]
      })
    )
  );

  assert.equal(result.backup.chatMessages.length, 1);
  assert.equal(result.backup.chatMessages[0].isStreaming, false);
  assert.ok(result.preview.warnings.some((warning) => warning.includes('conversación')));
});

test('reemplazar sustituye módulo, chat, bitácora y preferencias', () => {
  const imported = assertOk(
    parse(
      backup({
        topic: makeTopic('apostol-juan', 4),
        config: { contrastMode: 'projector-high-contrast', fontSize: 'xlarge' }
      })
    )
  );

  const current = emptyState({
    selectedTopic: makeTopic('apostol-pedro', 2),
    currentView: 'notebooklm',
    currentSlideIndex: 1,
    chatMessages: [message('actual')],
    moduleChats: { 'apostol-pedro': [message('actual')] },
    sessionHistory: [historyEntry(9)],
    stickyNotes: [sticky('actual')],
    contrastMode: 'clean-light',
    fontSize: 'large'
  });

  const next = buildImportedSession(current, imported.backup, 'replace');
  assert.equal(next.selectedTopic?.id, 'apostol-juan');
  assert.equal(next.currentView, 'presentation');
  assert.equal(next.currentSlideIndex, 0);
  assert.equal(next.chatMessages.length, 2);
  assert.deepEqual(Object.keys(next.moduleChats), ['apostol-juan']);
  assert.equal(next.moduleChats['apostol-juan'].length, 2);
  assert.equal(next.sessionHistory.length, 2);
  assert.equal(next.stickyNotes.length, 1);
  assert.equal(next.contrastMode, 'projector-high-contrast');
  assert.equal(next.fontSize, 'xlarge');
});

test('reemplazar con respaldo sin módulo vuelve al Home', () => {
  const imported = assertOk(
    parse(
      backup({
        topic: null,
        config: { contrastMode: 'clean-light', fontSize: 'large' }
      })
    )
  );

  const next = buildImportedSession(
    emptyState({ selectedTopic: makeTopic(), currentView: 'presentation' }),
    imported.backup,
    'replace'
  );

  assert.equal(next.selectedTopic, null);
  assert.equal(next.currentView, 'home');
  assert.equal(next.currentSlideIndex, 0);
  assert.deepEqual(next.moduleChats, {});
  assert.equal(next.chatMessages.length, 0);
  assert.equal(next.contrastMode, 'clean-light');
  assert.equal(next.fontSize, 'large');
});

test('fusionar el mismo módulo conserva lo actual y deduplica mensajes', () => {
  const imported = assertOk(
    parse(
      backup({
        chatMessages: [message('m1'), message('m2')],
        sessionHistory: [historyEntry(1)]
      })
    )
  );

  const current = emptyState({
    selectedTopic: makeTopic(),
    currentView: 'presentation',
    currentSlideIndex: 2,
    chatMessages: [message('m1'), message('actual')],
    moduleChats: { 'apostol-pedro': [message('m1'), message('actual')] },
    sessionHistory: [historyEntry(2)],
    contrastMode: 'clean-light',
    fontSize: 'large'
  });

  const next = buildImportedSession(current, imported.backup, 'merge');
  assert.equal(next.selectedTopic?.id, 'apostol-pedro');
  assert.equal(next.currentView, 'presentation');
  assert.equal(next.currentSlideIndex, 2);
  assert.deepEqual(
    next.chatMessages.map((item) => item.id),
    ['m1', 'actual', 'm2']
  );
  assert.equal(next.moduleChats['apostol-pedro'].length, 3);
  assert.equal(next.sessionHistory.length, 2);
  // Fusionar no cambia las preferencias actuales.
  assert.equal(next.contrastMode, 'clean-light');
  assert.equal(next.fontSize, 'large');
});

test('fusionar otro módulo conserva el módulo activo y guarda el importado', () => {
  const imported = assertOk(
    parse(
      backup({
        topic: makeTopic('apostol-juan'),
        sessionHistory: [historyEntry(1)],
        stickyNotes: [sticky('s1')]
      })
    )
  );

  const current = emptyState({
    selectedTopic: makeTopic('apostol-pedro'),
    currentView: 'presentation',
    currentSlideIndex: 1,
    chatMessages: [message('actual')],
    moduleChats: { 'apostol-pedro': [message('actual')] },
    sessionHistory: [historyEntry(2)],
    stickyNotes: [sticky('actual')]
  });

  const next = buildImportedSession(current, imported.backup, 'merge');
  assert.equal(next.selectedTopic?.id, 'apostol-pedro');
  assert.deepEqual(next.chatMessages.map((item) => item.id), ['actual']);
  assert.equal(next.moduleChats['apostol-pedro'].length, 1);
  assert.equal(next.moduleChats['apostol-juan'].length, 2);
  assert.equal(next.sessionHistory.length, 2);
  assert.equal(next.stickyNotes.length, 2);
});

test('fusionar sin sesión activa adopta el módulo del respaldo', () => {
  const imported = assertOk(parse(backup({ topic: makeTopic('apostol-pablo') })));
  const next = buildImportedSession(emptyState(), imported.backup, 'merge');

  assert.equal(next.selectedTopic?.id, 'apostol-pablo');
  assert.equal(next.currentView, 'presentation');
  assert.equal(next.chatMessages.length, 2);
  assert.equal(next.moduleChats['apostol-pablo'].length, 2);
  assert.equal(next.latestChatSources.length, 0);
});

test('reexportar e importar dos veces no duplica la conversación', () => {
  const imported = assertOk(parse(backup()));
  const once = buildImportedSession(emptyState(), imported.backup, 'merge');
  const twice = buildImportedSession(once, imported.backup, 'merge');

  assert.equal(twice.chatMessages.length, once.chatMessages.length);
  assert.equal(twice.sessionHistory.length, once.sessionHistory.length);
  assert.equal(twice.stickyNotes.length, once.stickyNotes.length);
});

test('la vista previa muestra advertencias de configuración inválida', () => {
  const result = assertOk(
    parse(
      backup({
        config: { contrastMode: 'neon', fontSize: 'gigante' }
      })
    )
  );

  assert.equal(result.backup.config.contrastMode, 'cinema-dark');
  assert.equal(result.backup.config.fontSize, 'normal');
  assert.equal(result.preview.warnings.length, 2);
});

console.log(`\n${passed} pruebas de importación superadas.`);

// Referencia de tipo para asegurar que el respaldo normalizado es reutilizable.
const _typeCheck: SessionBackup = assertOk(parse(backup())).backup;
void _typeCheck;
