import React from 'react';
import { X, ExternalLink, Globe, Sparkles, Pin } from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';

export const StickyNotesOverlay: React.FC = () => {
  const { stickyNotes, removeStickyNote } = usePresentationStore();

  if (stickyNotes.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-6 z-30 flex flex-col gap-3 max-w-sm pointer-events-none">
      {stickyNotes.map((note) => (
        <div
          key={note.id}
          className="pointer-events-auto bg-slate-900/95 border-2 border-emerald-500/60 rounded-2xl p-4 shadow-2xl shadow-emerald-500/20 backdrop-blur-lg transform transition-all duration-300 hover:scale-102 animate-slideUp text-slate-100"
        >
          {/* Header de la Tarjeta */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Sticky Note • Búsqueda Web
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400">{note.timestamp}</span>
              <button
                onClick={() => removeStickyNote(note.id)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Cerrar nota adhesiva"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pregunta Formulada */}
          <p className="text-xs font-semibold text-slate-300 mb-2 italic">
            "{note.query}"
          </p>

          {/* Respuesta Sintetizada */}
          <p className="text-xs leading-relaxed text-slate-200 mb-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            {note.answer}
          </p>

          {/* Enlaces a las fuentes web reales */}
          {note.web_results && note.web_results.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                Fuentes consultadas{note.provider ? ` · ${note.provider}` : ''}
              </p>
              {note.web_results.map((result) => (
                <a
                  key={result.id}
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={result.snippet || result.title}
                  className="flex items-start gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="truncate">
                    <span className="font-mono text-[9px] text-slate-500 mr-1">#{result.id}</span>
                    {result.title || result.url}
                  </span>
                </a>
              ))}
            </div>
          ) : note.external_url ? (
            <a
              href={note.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-medium hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="truncate max-w-[240px]">Fuente: {note.external_url}</span>
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
};
