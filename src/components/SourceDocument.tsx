import React from 'react';
import { Sparkles } from 'lucide-react';
import { NotesBlock, renderNotesMarkdown } from '../lib/notes';

interface SourceDocumentProps {
  blocks: NotesBlock[];
  activeBlockId?: string | null;
  /** Prefijo para los IDs del DOM (evita colisiones entre vistas). */
  idPrefix?: string;
  onSelectBlock?: (id: string) => void;
  emptyMessage?: string;
}

/**
 * Documento continuo del texto base con bloques anotados y resaltado RAG.
 * Es el mismo componente que usa el drawer de notas y el modo NotebookLM.
 */
export const SourceDocument: React.FC<SourceDocumentProps> = ({
  blocks,
  activeBlockId = null,
  idPrefix = '',
  onSelectBlock,
  emptyMessage = 'No se encontraron bloques anotados en el documento de notas.'
}) => {
  if (blocks.length === 0) {
    return <div className="text-slate-400 text-sm italic">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-4">
      {blocks.map((block) => {
        const isHighlighted = block.id === activeBlockId;

        return (
          <section
            key={block.id}
            id={`${idPrefix}${block.id}`}
            onClick={() => onSelectBlock?.(block.id)}
            className={`rounded-xl border p-4 transition-all duration-500 ${
              onSelectBlock ? 'cursor-pointer' : ''
            } ${
              isHighlighted
                ? 'smart-highlight-active bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-slate-850/60 border-slate-800/70 hover:border-slate-700'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded border border-slate-700/60 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-cyan-400">
                #{block.id}
              </span>
              {isHighlighted && (
                <span className="flex animate-pulse items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                  <Sparkles className="h-3 w-3" /> Resaltado RAG
                </span>
              )}
            </div>

            <div
              className="space-y-2"
              dangerouslySetInnerHTML={{ __html: renderNotesMarkdown(block.content) }}
            />
          </section>
        );
      })}
    </div>
  );
};
