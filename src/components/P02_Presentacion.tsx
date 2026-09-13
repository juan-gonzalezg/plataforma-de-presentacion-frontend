import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Search, 
  Home, 
  MessageSquareText, 
  HelpCircle,
  AlertTriangle,
  Code2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { RobotAvatar } from './RobotAvatar';
import { SmartHighlightDrawer } from './SmartHighlightDrawer';
import { SpotlightModal } from './SpotlightModal';
import { StickyNotesOverlay } from './StickyNotesOverlay';
import { SessionLogDrawer } from './SessionLogDrawer';
import { AccessibilityControls } from './AccessibilityControls';

export const P02_Presentacion: React.FC = () => {
  const {
    selectedTopic,
    currentSlideIndex,
    nextSlide,
    prevSlide,
    goToSlide,
    isDrawerOpen,
    toggleDrawer,
    toggleSpotlight,
    setCurrentView,
    robotMood,
    robotSpeechBubble,
    searchErrorToast,
    clearSearchError
  } = usePresentationStore();

  if (!selectedTopic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <button
          onClick={() => setCurrentView('home')}
          className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold"
        >
          Volver al Home
        </button>
      </div>
    );
  }

  const currentSlide = selectedTopic.slides[currentSlideIndex];
  const totalSlides = selectedTopic.slides.length;
  const progressPercent = Math.round(((currentSlideIndex + 1) / totalSlides) * 100);

  return (
    <div className="relative min-h-screen h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none">
      
      {/* Toast de Alerta Resiliente (HU-RES-01) */}
      {searchErrorToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-950/90 border-2 border-amber-500 text-amber-200 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-bounce">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-semibold">{searchErrorToast}</span>
          <button onClick={clearSearchError} className="text-xs text-amber-400 hover:text-white ml-2">✕</button>
        </div>
      )}

      {/* Barra Superior de Controles de la Sesión */}
      <header className="h-14 px-6 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
            title="Volver al selector de módulos"
          >
            <Home className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800" />

          <span className="text-xs font-bold text-slate-300 truncate max-w-xs sm:max-w-md">
            {selectedTopic.title}
          </span>
        </div>

        {/* Botones de Acción Rápida */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botón Spotlight Q */}
          <button
            onClick={toggleSpotlight}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all"
            title="Abrir Spotlight para dudas (Tecla Q o Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Duda al Vuelo</span>
            <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">Q</kbd>
          </button>

          {/* Botón Drawer Notas N */}
          <button
            onClick={toggleDrawer}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isDrawerOpen 
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Desplegar notas vivas (Tecla N)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Notas Vivas</span>
            <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-900/60 border border-slate-700">N</kbd>
          </button>

          {/* Botón Modo NotebookLM */}
          <button
            onClick={() => setCurrentView('notebooklm')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs font-medium transition-all"
            title="Ir al modo consulta extendida NotebookLM"
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Modo NotebookLM</span>
          </button>

          <AccessibilityControls />
        </div>
      </header>

      {/* Escenario Principal Dinámico (HU-PRS-02: 90% enfocado vs 65% con drawer) */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        <div 
          className={`stage-focus-transition h-full max-h-[750px] w-full bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-md ${
            isDrawerOpen ? 'lg:w-[65%] lg:mr-[460px]' : 'w-[92%] max-w-6xl mx-auto'
          }`}
        >
          {/* Elementos decorativos en la diapositiva */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Cabecera de la Lámina */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {currentSlide.tag}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Lámina {currentSlideIndex + 1} de {totalSlides}
              </span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-100 mb-2">
              {currentSlide.title}
            </h2>
            <p className="text-base sm:text-xl text-cyan-400 font-medium mb-6">
              {currentSlide.headline}
            </p>
          </div>

          {/* Cuerpo Central: Bullets + Snippet de Código */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto items-center">
            {/* Lista de Puntos Clave */}
            <div className={`${currentSlide.code_snippet ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3.5`}>
              {currentSlide.bullet_points.map((point, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-850/50 border border-slate-800/60 hover:border-slate-700 transition-all text-sm sm:text-base leading-relaxed text-slate-200"
                >
                  <div className="p-1 rounded-md bg-cyan-500/20 text-cyan-400 mt-0.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span>{point}</span>
                </div>
              ))}
            </div>

            {/* Código / Visual Snippet si existe */}
            {currentSlide.code_snippet && (
              <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-cyan-200 overflow-x-auto shadow-inner">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" /> Fragmento Técnico
                  </span>
                  <span>Ejemplo en Vivo</span>
                </div>
                <pre className="leading-relaxed">
                  <code>{currentSlide.code_snippet}</code>
                </pre>
              </div>
            )}
          </div>

          {/* Footer de la Lámina con Notas del Orador breves */}
          {currentSlide.speaker_notes && (
            <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-400 italic flex items-center gap-2">
              <span className="font-bold text-slate-300 not-italic">Idea Clave:</span>
              <span>"{currentSlide.speaker_notes}"</span>
            </div>
          )}
        </div>

        {/* Robot 2D reactivo en el escenario (Épica 3: BOT) */}
        <div className={`fixed bottom-24 transition-all duration-500 z-30 ${
          isDrawerOpen ? 'right-[480px]' : 'right-10'
        }`}>
          <RobotAvatar
            mood={robotMood}
            speechBubble={robotSpeechBubble}
            size="md"
            onClick={toggleSpotlight}
          />
        </div>
      </main>

      {/* Barra Inferior de Miniaturas y Línea de Tiempo (HU-PRS-01) */}
      <footer className="h-20 px-6 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-20">
        {/* Controles de Navegación Izquierda */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevSlide}
            disabled={currentSlideIndex === 0}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 font-bold transition-colors"
            title="Lámina anterior (Flecha Izquierda)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={nextSlide}
            disabled={currentSlideIndex === totalSlides - 1}
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-colors"
            title="Siguiente lámina (Flecha Derecha o Espacio)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <span className="text-xs font-mono text-slate-400 ml-2">
            {currentSlideIndex + 1} / {totalSlides} ({progressPercent}%)
          </span>
        </div>

        {/* Barra de Miniaturas Central */}
        <div className="hidden sm:flex items-center gap-2 overflow-x-auto py-2 px-4 max-w-xl">
          {selectedTopic.slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => goToSlide(idx)}
              className={`h-10 px-3 rounded-lg border text-xs font-mono transition-all flex items-center gap-1.5 whitespace-nowrap ${
                idx === currentSlideIndex
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md shadow-cyan-500/20 scale-105'
                  : 'bg-slate-850/70 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <span>{idx + 1}</span>
              <span className="hidden md:inline truncate max-w-[90px]">{slide.title}</span>
            </button>
          ))}
        </div>

        {/* Atajos de Teclado Recordatorio */}
        <div className="hidden lg:flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">→</kbd> Diapositivas</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">N</kbd> Notas</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">Q</kbd> Duda</span>
        </div>
      </footer>

      {/* Drawer Lateral de Notas Vivas (HU-NOT-01 y HU-NOT-02) */}
      <SmartHighlightDrawer />

      {/* Modal Spotlight para Dudas al Vuelo (HU-AIQ-01) */}
      <SpotlightModal />

      {/* Tarjetas Adhesivas Flotantes Web/RAG (HU-AIQ-02) */}
      <StickyNotesOverlay />

      {/* Bitácora de Dudas (HU-RES-03) */}
      <SessionLogDrawer />
    </div>
  );
};
