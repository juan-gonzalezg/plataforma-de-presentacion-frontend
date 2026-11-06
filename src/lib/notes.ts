/**
 * notes.ts
 * Utilidades compartidas para reconstruir el documento base a partir del
 * Markdown con bloques anotados que entrega el backend:
 *
 *   <div id="block-3" class="notes-block">
 *   ### 3. Título de la sección
 *   Texto de la sección...
 *   </div>
 *
 * Se usan tanto en el panel de notas de la presentación (P02) como en el
 * visor de texto base del modo NotebookLM (P03).
 */

export interface NotesBlock {
  id: string;
  title: string;
  content: string;
}

const BLOCK_PATTERN = /<div\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/div>/gi;

export function parseNotesBlocks(rawMarkdown: string): NotesBlock[] {
  const blocks: NotesBlock[] = [];
  if (!rawMarkdown) return blocks;

  // Regex con estado: se crea por llamada para no arrastrar lastIndex.
  const pattern = new RegExp(BLOCK_PATTERN.source, BLOCK_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rawMarkdown)) !== null) {
    const content = match[2].trim();
    const titleMatch = /^###\s+(.+)$/m.exec(content);
    blocks.push({
      id: match[1],
      title: titleMatch ? titleMatch[1].trim() : `Sección ${match[1]}`,
      content
    });
  }

  return blocks;
}

export function extractNotesTitle(rawMarkdown: string): string | null {
  const match = /^#\s+(.+)$/m.exec(rawMarkdown || '');
  return match ? match[1].trim() : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(text: string): string {
  return text
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="text-cyan-200 font-semibold">$1</strong>'
    )
    .replace(
      /`([^`]+)`/g,
      '<code class="px-1.5 py-0.5 rounded bg-slate-950 font-mono text-cyan-200 text-[0.85em] border border-slate-800">$1</code>'
    );
}

/**
 * Convierte el contenido de un bloque a HTML seguro y legible: encabezados,
 * negritas, código en línea y listas simples.
 */
export function renderNotesMarkdown(raw: string): string {
  const lines = escapeHtml(raw || '').split(/\r?\n/);
  const output: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('#### ')) {
      output.push(
        `<h5 class="text-sm font-bold text-slate-100 mt-1 mb-1.5">${renderInline(trimmed.slice(5))}</h5>`
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      output.push(
        `<h4 class="text-base font-bold text-slate-100 mt-1 mb-2">${renderInline(trimmed.slice(4))}</h4>`
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      output.push(
        `<h3 class="text-lg font-bold text-slate-100 mt-2 mb-2">${renderInline(trimmed.slice(3))}</h3>`
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      output.push(
        `<h2 class="text-xl font-bold text-slate-100 mt-2 mb-2">${renderInline(trimmed.slice(2))}</h2>`
      );
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      output.push(
        `<div class="flex gap-2 text-sm leading-relaxed text-slate-300"><span class="text-cyan-400 shrink-0">•</span><span>${renderInline(
          trimmed.replace(/^[-*]\s+/, '')
        )}</span></div>`
      );
      continue;
    }

    output.push(
      `<p class="text-sm leading-relaxed text-slate-300">${renderInline(trimmed)}</p>`
    );
  }

  return output.join('');
}
