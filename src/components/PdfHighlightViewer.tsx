import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Crosshair
} from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { HighlightBbox } from '../types';

// El worker de pdf.js se sirve como asset propio (Vite lo empaqueta),
// para no depender de un CDN externo y mantener el requisito de
// resiliencia sin conexión una vez cargado el build.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Visor de PDF para módulos cuya única fuente de notas es el archivo PDF
 * (sin notas_completas.md). Dibuja un recuadro de Smart Highlight sobre
 * el párrafo indicado por el backend, usando el bbox precalculado en el
 * momento de la indexación (ver rag_engine.extract_pdf_blocks).
 *
 * Incluye navegación de páginas y un botón para volver al resaltado activo,
 * de modo que el usuario pueda hojear el documento sin perder la cita.
 */
export const PdfHighlightViewer: React.FC = () => {
  const { selectedTopic, activeHighlightPage, activeHighlightBbox, fetchPdfViewUrl } =
    usePresentationStore();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [viewPage, setViewPage] = useState<number>(1);
  const [pageWidth, setPageWidth] = useState<number>(420);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetPageRef = useRef<HTMLDivElement | null>(null);

  // Carga la URL firmada/pública del PDF cuando cambia el módulo activo
  useEffect(() => {
    let cancelled = false;
    setPdfUrl(null);
    setError(null);
    setNumPages(0);
    setViewPage(1);

    if (selectedTopic) {
      fetchPdfViewUrl(selectedTopic.id).then((url) => {
        if (cancelled) return;
        if (url) setPdfUrl(url);
        else setError('No se pudo cargar el PDF de este módulo.');
      });
    }

    return () => {
      cancelled = true;
    };
  }, [selectedTopic, fetchPdfViewUrl]);

  // Mantiene el ancho de renderizado sincronizado con el panel (split view)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      setPageWidth(Math.max(280, el.clientWidth - 24));
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pdfUrl]);

  // Cuando llega un Smart Highlight, salta a la página citada
  useEffect(() => {
    if (activeHighlightPage) {
      setViewPage(activeHighlightPage);
    }
  }, [activeHighlightPage]);

  // Auto-scroll hacia la página visible cuando cambia la página o el resaltado
  useEffect(() => {
    if (!targetPageRef.current) return;
    const timer = setTimeout(() => {
      targetPageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => clearTimeout(timer);
  }, [viewPage, numPages, activeHighlightPage]);

  const goToPage = useCallback(
    (page: number) => {
      if (!numPages) return;
      setViewPage(Math.min(Math.max(1, page), numPages));
    },
    [numPages]
  );

  if (!selectedTopic) return null;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-6 text-center">
        <AlertTriangle className="w-6 h-6 text-amber-400" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-10">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <p className="text-xs">Cargando material en PDF...</p>
      </div>
    );
  }

  // Renderiza la página visible y sus vecinas inmediatas para no pagar el
  // costo de dibujar un PDF completo de muchas páginas.
  const pagesToRender = Array.from({ length: numPages }, (_, i) => i + 1).filter(
    (p) => numPages <= 3 || Math.abs(p - viewPage) <= 1
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Barra de navegación del PDF */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-1 pb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(viewPage - 1)}
            disabled={viewPage <= 1 || !numPages}
            title="Página anterior"
            className="rounded-md border border-slate-700 bg-slate-900 p-1.5 text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[76px] text-center font-mono text-[11px] text-slate-300">
            Pág. {viewPage} / {numPages || '—'}
          </span>
          <button
            type="button"
            onClick={() => goToPage(viewPage + 1)}
            disabled={!numPages || viewPage >= numPages}
            title="Página siguiente"
            className="rounded-md border border-slate-700 bg-slate-900 p-1.5 text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {activeHighlightPage ? (
          <button
            type="button"
            onClick={() => goToPage(activeHighlightPage)}
            title={`Ir a la página ${activeHighlightPage} del resaltado`}
            className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/25"
          >
            <Crosshair className="h-3.5 w-3.5" />
            Ir al resaltado
            {activeHighlightPage !== viewPage ? ` (p.${activeHighlightPage})` : ''}
          </button>
        ) : (
          <span className="text-[10px] font-mono text-slate-500">Sin resaltado activo</span>
        )}
      </div>

      {/* Lienzo del documento */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto p-3 bg-slate-950/40">
        <Document
          file={pdfUrl}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span className="text-xs">Renderizando documento...</span>
            </div>
          }
          error={
            <div className="text-sm text-amber-400 p-4 text-center">
              No se pudo renderizar el PDF en el visor. Puedes descargarlo directamente.
            </div>
          }
        >
          {pagesToRender.map((pageNum) => (
            <PdfPage
              key={pageNum}
              pageNumber={pageNum}
              pageWidth={pageWidth}
              isViewPage={pageNum === viewPage}
              bbox={pageNum === activeHighlightPage ? activeHighlightBbox : null}
              registerTargetRef={(el) => {
                if (pageNum === viewPage) targetPageRef.current = el;
              }}
            />
          ))}
        </Document>
      </div>
    </div>
  );
};

interface PdfPageProps {
  pageNumber: number;
  pageWidth: number;
  isViewPage: boolean;
  bbox: HighlightBbox | null;
  registerTargetRef: (el: HTMLDivElement | null) => void;
}

const PdfPage: React.FC<PdfPageProps> = ({
  pageNumber,
  pageWidth,
  isViewPage,
  bbox,
  registerTargetRef
}) => {
  // originalWidth/originalHeight son las dimensiones reales del PDF (en
  // puntos), la misma unidad que usa pdfplumber para calcular el bbox
  // en el backend. Con esto escalamos el recuadro al tamaño renderizado.
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null);
  const scale = originalSize ? pageWidth / originalSize.width : 1;

  return (
    <div
      ref={registerTargetRef}
      className={`relative mx-auto mb-4 shadow-lg shadow-black/40 ${
        isViewPage ? '' : 'opacity-80'
      }`}
      style={{ width: pageWidth }}
    >
      <Page
        pageNumber={pageNumber}
        width={pageWidth}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        onLoadSuccess={(page) => {
          // page.originalWidth / page.originalHeight vienen sin escalar
          setOriginalSize({ width: page.originalWidth, height: page.originalHeight });
        }}
      />

      {bbox && originalSize && (
        <div
          className="smart-highlight-active pointer-events-none absolute rounded-md border-2 border-amber-400 bg-amber-400/20 shadow-lg shadow-amber-500/30 transition-all duration-500"
          style={{
            left: bbox.x0 * scale,
            top: bbox.top * scale,
            width: Math.max(4, (bbox.x1 - bbox.x0) * scale),
            height: Math.max(4, (bbox.bottom - bbox.top) * scale),
          }}
        />
      )}

      <span className="absolute -top-2 -left-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
        Pág. {pageNumber}
      </span>
    </div>
  );
};
