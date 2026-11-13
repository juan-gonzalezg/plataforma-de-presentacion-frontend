/**
 * sessionExport.ts
 * Genera documentos exportables de la sesión: apuntes del módulo, conversación
 * con la IA, bitácora de dudas y un respaldo JSON completo.
 *
 * Todo se construye en el cliente, sin backend, para que funcione también
 * cuando la conexión falla durante la exposición.
 */

import type {
  ChatMessage,
  QueryResponse,
  StickyNote,
  TopicDetail
} from '../types';
import { parseNotesBlocks } from './notes';

/** Convierte un título en un nombre de archivo seguro. */
export function slugify(value: string): string {
  return (value || 'sesion')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'sesion';
}

/** Marca de tiempo estable para nombres de archivo: 2026-11-08_1530 */
export function fileStamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}_${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/** Descarga texto en el navegador mediante un Blob temporal. */
export function downloadText(
  filename: string,
  content: string,
  mime = 'text/markdown;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revocar de inmediato puede cancelar la descarga en algunos navegadores.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function topicHeader(topic: TopicDetail, exportedAt: string): string[] {
  return [
    `# ${topic.title}`,
    '',
    topic.subtitle ? `**${topic.subtitle}**` : '',
    '',
    `- **Categoría:** ${topic.category}`,
    `- **Láminas:** ${topic.slides_count ?? topic.slides.length}`,
    `- **Duración estimada:** ${topic.estimated_minutes} min`,
    topic.tags?.length ? `- **Etiquetas:** ${topic.tags.join(', ')}` : '',
    `- **Exportado:** ${exportedAt}`,
    '',
    topic.summary ? `> ${topic.summary}` : ''
  ].filter(Boolean);
}

/**
 * Apuntes completos del módulo. Si hay notas Markdown se reconstruyen por
 * bloques anotados (se conservan los IDs como comentarios para poder citar);
 * si no, se genera el contenido a partir de las láminas.
 */
export function buildNotesMarkdown(
  topic: TopicDetail,
  exportedAt = new Date().toLocaleString()
): string {
  const header = topicHeader(topic, exportedAt);
  const rawNotes = topic.notes_markdown?.trim();

  if (rawNotes) {
    const blocks = parseNotesBlocks(rawNotes);
    const body = blocks.length
      ? blocks
          .map((block) => `<!-- ${block.id} -->\n\n${block.content.trim()}`)
          .join('\n\n---\n\n')
      : rawNotes;

    return [...header, '', '---', '', body, ''].join('\n');
  }

  const slides = (topic.slides ?? []).map((slide) => {
    const lines = [`## Lámina ${slide.number} — ${slide.title}`, ''];

    if (slide.headline) lines.push(`**${slide.headline}**`, '');
    if (slide.tag) lines.push(`_${slide.tag}_`, '');

    for (const point of slide.bullet_points ?? []) {
      lines.push(`- ${point}`);
    }

    if (slide.bullet_points?.length) lines.push('');

    if (slide.code_snippet) {
      lines.push('```', slide.code_snippet, '```', '');
    }

    if (slide.speaker_notes) {
      lines.push(`> **Idea clave:** ${slide.speaker_notes}`, '');
    }

    return lines.join('\n').trim();
  });

  return [...header, '', '---', '', slides.join('\n\n---\n\n'), ''].join('\n');
}

function sourceList(message: ChatMessage): string[] {
  const lines: string[] = [];
  const local = (message.sources ?? []).filter((source) => source.source !== 'web');
  const web = (message.sources ?? []).filter((source) => source.source === 'web');
  const webResults = message.webResults ?? [];

  if (local.length > 0) {
    lines.push('- **Fuentes locales:**');
    for (const source of local) {
      const page = source.pagina ? ` (p. ${source.pagina})` : '';
      lines.push(`  - [${source.id}] ${source.title}${page}`);
    }
  }

  if (web.length > 0 || webResults.length > 0) {
    lines.push('- **Fuentes web:**');
    const seen = new Set<string>();

    for (const source of web) {
      if (!source.url || seen.has(source.url)) continue;
      seen.add(source.url);
      lines.push(`  - [${source.id}] ${source.title}: ${source.url}`);
    }

    for (const result of webResults) {
      if (!result.url || seen.has(result.url)) continue;
      seen.add(result.url);
      lines.push(`  - ${result.title}: ${result.url}`);
    }
  }

  return lines;
}

/** Conversación completa con citas, modo de generación y fuentes. */
export function buildChatMarkdown(
  topic: TopicDetail | null,
  messages: ChatMessage[],
  exportedAt = new Date().toLocaleString()
): string {
  const lines: string[] = [
    `# Conversación de estudio${topic ? ` — ${topic.title}` : ''}`,
    '',
    topic ? `- **Módulo:** ${topic.title}` : '- **Módulo:** sin seleccionar',
    topic?.subtitle ? `- **Tema:** ${topic.subtitle}` : '',
    `- **Exportada:** ${exportedAt}`,
    `- **Mensajes:** ${messages.length}`,
    '',
    '---',
    ''
  ].filter(Boolean);

  if (messages.length === 0) {
    lines.push('_No hay mensajes en esta conversación._', '');
    return lines.join('\n');
  }

  for (const message of messages) {
    const author = message.sender === 'user' ? 'Tú' : 'Asistente';
    lines.push(`## ${author} · ${message.timestamp}`, '');
    lines.push(message.text.trim() || '_(sin contenido)_', '');

    if (message.notice) {
      lines.push(`> ${message.notice}`, '');
    }

    if (message.mode) {
      lines.push(
        `- **Modo:** ${message.mode === 'llm' ? 'LLM generativo' : 'extractivo'}`
      );
    }

    if (message.citations?.length) {
      lines.push(`- **Citas:** ${message.citations.join(', ')}`);
    }

    lines.push(...sourceList(message));

    if (message.external_url) {
      lines.push(`- **URL principal:** ${message.external_url}`);
    }

    lines.push('', '---', '');
  }

  return lines.join('\n');
}

function sourceLabel(source: QueryResponse['source']): string {
  if (source === 'local') return 'Notas Oficiales';
  if (source === 'timeout') return 'Sin conexión / tiempo agotado';
  return 'Búsqueda Web Externa';
}

/** Bitácora de dudas resueltas, ordenada de la más reciente a la más antigua. */
export function buildSessionLogMarkdown(
  history: QueryResponse[],
  topicTitle?: string,
  exportedAt = new Date().toLocaleString()
): string {
  const lines: string[] = [
    '# Bitácora de Dudas y Respuestas de la Sesión',
    '',
    topicTitle ? `- **Módulo:** ${topicTitle}` : '',
    `- **Exportada:** ${exportedAt}`,
    `- **Consultas registradas:** ${history.length}`,
    '',
    '---',
    ''
  ].filter(Boolean);

  if (history.length === 0) {
    lines.push('_Aún no hay dudas registradas en esta sesión._', '');
    return lines.join('\n');
  }

  history.forEach((item, index) => {
    lines.push(`## ${index + 1}. "${item.query}"`, '');
    lines.push(`- **Fuente:** ${sourceLabel(item.source)}`);
    if (item.provider) lines.push(`- **Proveedor web:** ${item.provider}`);
    lines.push(
      `- **Confianza:** ${Math.round((item.confidence ?? 0) * 100)}% | **Latencia:** ${
        item.latency_ms ?? 0
      } ms`
    );
    if (item.target_block_id) {
      lines.push(
        `- **Bloque citado:** ${item.target_block_id}${
          item.block_title ? ` — ${item.block_title}` : ''
        }`
      );
    }
    if (item.pagina) lines.push(`- **Página del PDF:** ${item.pagina}`);
    if (item.mode) {
      lines.push(
        `- **Modo:** ${item.mode === 'llm' ? 'LLM generativo' : 'extractivo'}`
      );
    }
    lines.push(`- **Respuesta:** ${item.answer_summary}`);
    if (item.excerpt) lines.push(`- **Extracto:** ${item.excerpt}`);
    if (item.external_url) lines.push(`- **URL externa:** ${item.external_url}`);

    if (item.web_results?.length) {
      lines.push('- **Fuentes web:**');
      for (const result of item.web_results) {
        lines.push(`  - [${result.id}] ${result.title}: ${result.url}`);
      }
    }

    lines.push('', '---', '');
  });

  return lines.join('\n');
}

export interface SessionBackupInput {
  topic: TopicDetail | null;
  chatMessages: ChatMessage[];
  sessionHistory: QueryResponse[];
  stickyNotes: StickyNote[];
  contrastMode: string;
  fontSize: string;
}

/**
 * Respaldo JSON completo y reutilizable. Incluye el módulo (diapositivas y
 * notas) para que una futura importación pueda restaurar la sesión completa.
 */
export function buildSessionBackup(
  input: SessionBackupInput,
  exportedAt = new Date().toISOString()
): string {
  return JSON.stringify(
    {
      app: 'Plataforma de Presentación Interactiva',
      schemaVersion: 1,
      exportedAt,
      topic: input.topic,
      config: {
        contrastMode: input.contrastMode,
        fontSize: input.fontSize
      },
      chatMessages: input.chatMessages,
      sessionHistory: input.sessionHistory,
      stickyNotes: input.stickyNotes
    },
    null,
    2
  );
}
