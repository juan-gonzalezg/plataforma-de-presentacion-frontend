import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, BookOpen, Download, Loader2 } from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { RobotAvatar } from './RobotAvatar';
import { PdfHighlightViewer } from './PdfHighlightViewer';
import { SourceDocument } from './SourceDocument';
import { parseNotesBlocks } from '../lib/notes';

export const SmartHighlightDrawer: React.FC = () => {
  const { 
    isDrawerOpen, 
    toggleDrawer, 
    selectedTopic, 
    activeHighlightBlockId,
    setActiveHighlightBlockId,
    robotMood,
    setRobotSpeech,
    downloadTopicMaterial
  } = usePresentationStore();

  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reconstruye el documento continuo a partir de los bloques anotados.
  // El parseo se memoiza para no repetirlo en cada render.
  const notesBlocks = useMemo(
    () => parseNotesBlocks(selectedTopic?.notes_markdown ?? ''),
    [selectedTopic?.notes_markdown]
  );

  const handleDownload = async () => {
    if (!selectedTopic || isDownloading) return;
    setIsDownloading(true);
    setRobotSpeech(`Preparando descarga del material en PDF...`, 3000);

    try {
      const res = await downloadTopicMaterial(selectedTopic.id, 'pdf');
      if (res) {
        setRobotSpeech('¡Descarga iniciada! Material oficial listo.', 3500);
      } else {
        setRobotSpeech('No se pudo descargar el archivo en este momento.', 3500);
      }
    } catch (err) {
      console.error('Error al descargar:', err);
      setRobotSpeech('Error de conexión al obtener el archivo.', 3500);
    } finally {
      setIsDownloading(false);
    }
  };

  // Auto-scroll suave hacia el bloque resaltado (HU-NOT-02)
  useEffect(() => {
    if (isDrawerOpen && activeHighlightBlockId && containerRef.current) {
      const timer = setTimeout(() => {
        const el = document.getElementById(activeHighlightBlockId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isDrawerOpen, activeHighlightBlockId]);

  if (!selectedTopic) return null;

  const hasMarkdownNotes = Boolean(selectedTopic.notes_markdown);

  return (
    <aside 
      className={`fixed top-0 right-0 h-full w-[380px] sm:w-[450px] lg:w-[480px] bg-slate-900/95 border-l border-slate-700/80 shadow-2xl backdrop-blur-xl z-40 flex flex-col transition-transform duration-500 ease-in-out ${
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      aria-label="Panel de Notas Vivas"
    >
      {/* Header del Drawer */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">Documento de Notas Vivas</h2>
            <p className="text-xs text-slate-400">Smart Highlight con Referencia RAG</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
            Tecla 'N'
          </span>
          <button
            onClick={toggleDrawer}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Cerrar panel de notas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mini Robot Tutor en la cabecera del drawer y botón de descarga */}
      <div className="px-4 py-2.5 bg-slate-850/80 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <RobotAvatar mood={activeHighlightBlockId ? 'apuntar_puntero' : 'idle_atento'} size="sm" />
          <div className="text-xs truncate">
            <p className="font-medium text-cyan-300 truncate">
              {activeHighlightBlockId ? 'Robot Tutor: Señalando párrafo exacto' : 'Robot Tutor: Escuchando preguntas'}
            </p>
            <p className="text-[11px] text-slate-400">
              {activeHighlightBlockId ? `Bloque activo: #${activeHighlightBlockId}` : 'Presiona Q para consultar'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeHighlightBlockId && (
            <button
              onClick={() => setActiveHighlightBlockId(null)}
              className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 transition-colors"
            >
              Limpiar foco
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400/50 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar material oficial de este módulo en PDF"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                <span className="hidden sm:inline">Descargando...</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3 text-cyan-400" />
                <span>Descargar material</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Contenido: visor de PDF con recuadro (módulos sin notas_markdown) o documento Markdown (temas de ejemplo) */}
      {hasMarkdownNotes ? (
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto p-5 space-y-5 text-slate-200"
        >
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">
              Fundamentación Teórica Oficial
            </p>

            {notesBlocks.length > 0 ? (
              <SourceDocument blocks={notesBlocks} activeBlockId={activeHighlightBlockId} />
            ) : (
              <div className="text-slate-400 text-sm italic">
                No se encontraron bloques anotados en el documento de notas.
              </div>
            )}
          </div>
        </div>
      ) : (
        <PdfHighlightViewer />
      )}

      {/* Footer del Drawer con atajos útiles */}
      <div className="p-3 bg-slate-950 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Presiona <strong className="text-slate-300 font-mono">Q</strong> para hacer preguntas</span>
        <span><strong className="text-slate-300 font-mono">Esc</strong> para cerrar</span>
      </div>
    </aside>
  );
};
