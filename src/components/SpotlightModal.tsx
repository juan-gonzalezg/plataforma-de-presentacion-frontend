import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, Globe, Loader2, ArrowRight, CornerDownLeft } from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';

export const SpotlightModal: React.FC = () => {
  const { 
    isSpotlightOpen, 
    setSpotlightOpen, 
    askQuestion, 
    isSearching,
    selectedTopic,
    currentSlideIndex
  } = usePresentationStore();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofoco cuando se abre el modal
  useEffect(() => {
    if (isSpotlightOpen) {
      setQuery('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSpotlightOpen]);

  if (!isSpotlightOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;
    const q = query.trim();
    setQuery('');
    setSpotlightOpen(false); // Cierra el spotlight y ejecuta la búsqueda reactiva
    await askQuestion(q);
  };

  const currentSlide = selectedTopic?.slides[currentSlideIndex];

  // Sugerencias rápidas según la lámina actual
  const quickSuggestions = currentSlide ? [
    currentSlide.title,
    `¿Qué es ${currentSlide.headline.split(' ')[0]}?`,
    "¿Cuál es el patrón recomendado?"
  ] : ["Circuit Breaker", "Zero Trust", "RAG vs Fine-Tuning"];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md transition-opacity animate-fadeIn"
      onClick={() => setSpotlightOpen(false)}
    >
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-500/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con título y botón de cerrar */}
        <div className="px-5 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-200">Asistente Contextual RAG & Web</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Lámina {currentSlideIndex + 1}: {currentSlide?.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400">
              Esc para salir
            </span>
            <button
              onClick={() => setSpotlightOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Formulario de Pregunta */}
        <form onSubmit={handleSubmit} className="p-5">
          <div className="relative flex items-center">
            <Search className="w-6 h-6 text-cyan-400 absolute left-4 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 150))}
              placeholder="¿Tienes una duda? Escribe aquí... (ej. ¿Cómo funciona Circuit Breaker?)"
              maxLength={150}
              disabled={isSearching}
              className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-400 rounded-xl pl-13 pr-28 py-4 text-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all font-sans"
            />

            {/* Contador y botón de envío */}
            <div className="absolute right-3 flex items-center gap-2">
              <span className={`text-xs font-mono ${query.length >= 140 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                {query.length}/150
              </span>

              <button
                type="submit"
                disabled={!query.trim() || isSearching}
                className="p-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/30 flex items-center justify-center"
              >
                {isSearching ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                ) : (
                  <CornerDownLeft className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Sugerencias Rápidas */}
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <p className="text-xs text-slate-400 font-medium mb-2 flex items-center gap-1.5">
              <span>Sugerencias contextuales para esta diapositiva:</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(sug);
                    inputRef.current?.focus();
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-500/20 hover:text-cyan-200 border border-slate-700 hover:border-cyan-500/50 text-slate-300 transition-all flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resumen de Política RAG */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Prioridad: notas oficiales (síntesis en menos de 4 s)
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-400" /> Web en segundo plano si no está en el texto base
            </span>
          </div>
        </form>
      </div>
    </div>
  );
};
