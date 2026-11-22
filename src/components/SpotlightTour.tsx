import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

export interface TourStep {
  /** Selector CSS del elemento que debe quedar nítido. */
  selector: string;
  title: string;
  description: string;
}

interface SpotlightTourProps {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const CARD_WIDTH = 360;
const CARD_ESTIMATED_HEIGHT = 220;
const HIGHLIGHT_PADDING = 6;

/**
 * Tour guiado ligero: atenúa el resto de la pantalla, deja nítida solo la zona
 * del paso actual y nunca bloquea la aplicación (se puede salir con Esc, con
 * clic fuera o con "Saltar guía").
 */
export const SpotlightTour: React.FC<SpotlightTourProps> = ({
  steps,
  open,
  onClose
}) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);

  const total = steps.length;
  const step = steps[index];

  // Cada vez que se reabre, empezamos desde el primer paso.
  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const measure = useCallback(() => {
    if (!step || typeof document === 'undefined') {
      setRect(null);
      return;
    }

    const target = document.querySelector(step.selector);
    if (!target) {
      setRect(null);
      return;
    }

    const r = target.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;

    measure();
    const frame = window.requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure]);

  // Salida sin fricción: Esc cierra en cualquier paso.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const highlightStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!rect) return undefined;
    return {
      top: rect.top - HIGHLIGHT_PADDING,
      left: rect.left - HIGHLIGHT_PADDING,
      width: rect.width + HIGHLIGHT_PADDING * 2,
      height: rect.height + HIGHLIGHT_PADDING * 2,
      boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.78)'
    };
  }, [rect]);

  const cardStyle = useMemo<React.CSSProperties>(() => {
    const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight;
    const width = Math.min(CARD_WIDTH, Math.max(280, viewportWidth - 32));

    if (!rect) {
      return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width };
    }

    const left = Math.min(
      Math.max(16, rect.left),
      Math.max(16, viewportWidth - width - 16)
    );

    const fitsBelow =
      viewportHeight - (rect.top + rect.height) > CARD_ESTIMATED_HEIGHT + 24;
    const top = fitsBelow
      ? rect.top + rect.height + HIGHLIGHT_PADDING + 12
      : Math.max(16, rect.top - CARD_ESTIMATED_HEIGHT - 12);

    return { left, top, width };
  }, [rect]);

  if (!open || total === 0 || !step) return null;

  const isLast = index === total - 1;
  const goNext = () => {
    if (isLast) onClose();
    else setIndex((i) => Math.min(i + 1, total - 1));
  };

  return (
    <div
      className="fixed inset-0 z-[100]"
      onClick={onClose}
      role="presentation"
      aria-label="Guía rápida"
    >
      {highlightStyle ? (
        <div
          className="pointer-events-none absolute rounded-2xl border-2 border-cyan-400/80 transition-all duration-200"
          style={highlightStyle}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />
      )}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-lg transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
      >
        Salir
      </button>

      <div
        className="absolute rounded-2xl border border-cyan-500/40 bg-slate-900/95 p-4 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl transition-all duration-200"
        style={cardStyle}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="false"
        aria-live="polite"
      >
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-300">
          <HelpCircle className="h-3.5 w-3.5" />
          {index + 1} de {total} · {step.title}
        </div>

        <p className="text-sm leading-relaxed text-slate-200">{step.description}</p>

        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            Saltar guía
          </button>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>
            )}
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400"
            >
              {isLast ? 'Listo' : 'Siguiente'}
              {!isLast && <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
