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
  Sparkles,
  Bot,
  EyeOff
} from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { RobotAvatar } from './RobotAvatar';
import { SmartHighlightDrawer } from './SmartHighlightDrawer';
import { SpotlightModal } from './SpotlightModal';
import { StickyNotesOverlay } from './StickyNotesOverlay';
import { AccessibilityControls } from './AccessibilityControls';
import { SpotlightTour, TourStep } from './SpotlightTour';
import { hasSeenGuide, markGuideSeen } from '../lib/guideSeen';
import { RobotPresence } from '../types';
import {
  ROBOT_PRESENCE_DESCRIPTION,
  ROBOT_PRESENCE_LABEL,
  nextRobotPresence,
  readRobotPresence,
  saveRobotPresence
} from '../lib/robotPresence';

const PRESENTATION_GUIDE_STEPS: TourStep[] = [
  {
    selector: '[data-tour="presentation-toolbar"]',
    title: 'Herramientas de la sesión',
    description:
      'Aquí tienes "Duda al Vuelo" (Q) para preguntar, "Notas Vivas" (N) para abrir el documento, el Modo de Estudio y el robot. La guía siempre se puede reabrir desde el botón "Guía".'
  },
  {
    selector: '[data-tour="presentation-slide"]',
    title: 'Lámina',
    description:
      'La diapositiva se muestra a todo lo ancho. Avanza con las flechas del teclado o con los botones de abajo; la idea clave aparece al final.'
  },
  {
    selector: '[data-tour="presentation-nav"]',
    title: 'Navegación',
    description:
      'Usa las flechas o las miniaturas para saltar a cualquier lámina. El contador muestra la posición y el progreso de la presentación.'
  }
];

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
    clearSearchError,
    activeHighlightBlockId,
    activeHighlightPage
  } = usePresentationStore();

  // HU-BOT-01: el robot deja de estar anclado a una altura fija y se
  // reposiciona al margen del bloque Markdown citado o del bbox del PDF.
  const [robotTop, setRobotTop] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!isDrawerOpen) {
      setRobotTop(null);
      return;
    }

    const updateRobotPosition = () => {
      const selector = activeHighlightBlockId
        ? `[data-notes-block="${activeHighlightBlockId}"]`
        : activeHighlightPage
          ? '[data-pdf-highlight="true"]'
          : null;

      if (!selector) {
        setRobotTop(null);
        return;
      }

      const target = document.querySelector<HTMLElement>(selector);
      if (!target) {
        setRobotTop(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      // El avatar mide 96px (w-24) y la burbuja de diálogo crece hacia
      // arriba, así que centramos el robot en el bloque con margen superior.
      const desired = rect.top + rect.height / 2 - 48;
      const minTop = 88;
      const maxTop = Math.max(minTop, window.innerHeight - 200);
      setRobotTop(Math.min(Math.max(desired, minTop), maxTop));
    };

    updateRobotPosition();

    // El scroll de cualquier contenedor (drawer, PDF, ventana) no burbujea,
    // pero sí se puede observar en fase de captura desde window. Se agrupa
    // en un frame para no re-renderizar en cada evento.
    let frame = 0;
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateRobotPosition();
      });
    };

    window.addEventListener('scroll', scheduleUpdate, true);
    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('smart-highlight-positioned', scheduleUpdate);

    // Reintento tras la transición de apertura del drawer y tras el
    // auto-scroll interno que hace la cita activa.
    const timers = [350, 750, 1200].map((delay) =>
      window.setTimeout(updateRobotPosition, delay)
    );

    return () => {
      window.removeEventListener('scroll', scheduleUpdate, true);
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('smart-highlight-positioned', scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [isDrawerOpen, activeHighlightBlockId, activeHighlightPage, currentSlideIndex]);

  // Presencia del robot durante la exposición (Completo / Discreto / Oculto).
  // «Discreto» es el valor por defecto: robot pequeño, estático y sin burbujas.
  const [robotPresence, setRobotPresence] = React.useState<RobotPresence>(() =>
    readRobotPresence()
  );

  React.useEffect(() => {
    saveRobotPresence(robotPresence);
  }, [robotPresence]);

  const cycleRobotPresence = React.useCallback(() => {
    setRobotPresence((current) => nextRobotPresence(current));
  }, []);

  // Tecla R: alterna la presencia sin abrir menús en plena charla.
  React.useEffect(() => {
    const handleRobotKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'r' && event.key !== 'R') return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;

      const active = document.activeElement as HTMLElement | null;
      const tagName = active?.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || active?.isContentEditable) {
        return;
      }

      event.preventDefault();
      cycleRobotPresence();
    };

    window.addEventListener('keydown', handleRobotKeyDown);
    return () => window.removeEventListener('keydown', handleRobotKeyDown);
  }, [cycleRobotPresence]);

  // Mini-guía de la presentación: aparece una sola vez y se reabre desde "Guía".
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);

  const closeGuide = React.useCallback(() => {
    setIsGuideOpen(false);
    markGuideSeen('presentation');
  }, []);

  React.useEffect(() => {
    if (hasSeenGuide('presentation')) return;
    const timer = window.setTimeout(() => {
      if (!hasSeenGuide('presentation')) setIsGuideOpen(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

  const isDiscreteRobot = robotPresence === 'discreto';

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
        <div data-tour="presentation-toolbar" className="flex items-center gap-2 sm:gap-3">
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

          {/* Botón Modo de Estudio (mismo nombre que la vista destino) */}
          <button
            onClick={() => setCurrentView('notebooklm')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs font-medium transition-all"
            title="Ir al Modo de Estudio: asistente, documento y lámina"
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Modo de Estudio</span>
          </button>

          {/* Presencia del robot en la exposición (tecla R) */}
          <button
            onClick={cycleRobotPresence}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              robotPresence === 'completo'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : robotPresence === 'discreto'
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-900/70 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={`Robot en presentación: ${ROBOT_PRESENCE_LABEL[robotPresence]}. ${ROBOT_PRESENCE_DESCRIPTION[robotPresence]} Clic o tecla R para cambiar.`}
            aria-label={`Presencia del robot: ${ROBOT_PRESENCE_LABEL[robotPresence]}. Cambiar con clic o tecla R.`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                robotPresence === 'completo'
                  ? 'bg-emerald-400'
                  : robotPresence === 'discreto'
                    ? 'bg-cyan-400'
                    : 'bg-slate-600'
              }`}
            />
            {robotPresence === 'oculto' ? (
              <EyeOff className="w-3.5 h-3.5" />
            ) : (
              <Bot className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Robot: {ROBOT_PRESENCE_LABEL[robotPresence]}</span>
            <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-900/60 border border-slate-700">R</kbd>
          </button>

          <AccessibilityControls />
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            title="Guía rápida de la presentación"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guía</span>
          </button>
        </div>
      </header>

      {/* Escenario Principal Dinámico (HU-PRS-02: 90% enfocado vs 65% con drawer) */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        <div
          data-tour="presentation-slide"
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

        {/* El robot 2D reactivo en el escenario (Épica 3: BOT).
            En modo discreto se reduce a un indicador pequeño y estático. */}
        {robotPresence !== 'oculto' && (
          <div
            className={`fixed z-30 transition-all duration-500 ${
              isDrawerOpen ? 'right-[480px]' : isDiscreteRobot ? 'right-6' : 'right-10'
            } ${
              isDiscreteRobot
                ? 'bottom-24 opacity-70 hover:opacity-100'
                : robotTop === null
                  ? 'bottom-24'
                  : ''
            }`}
            style={!isDiscreteRobot && robotTop !== null ? { top: `${robotTop}px` } : undefined}
          >
            <RobotAvatar
              mood={robotMood}
              speechBubble={isDiscreteRobot ? null : robotSpeechBubble}
              size={isDiscreteRobot ? 'sm' : 'md'}
              quiet={isDiscreteRobot}
              onClick={toggleSpotlight}
            />
          </div>
        )}
      </main>

      {/* Barra Inferior de Miniaturas y Línea de Tiempo (HU-PRS-01) */}
      <footer data-tour="presentation-nav" className="h-20 px-6 border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-20">
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
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">R</kbd> Robot</span>
        </div>
      </footer>

      {/* Drawer Lateral de Notas Vivas (HU-NOT-01 y HU-NOT-02) */}
      <SmartHighlightDrawer />

      {/* Modal Spotlight para Dudas al Vuelo (HU-AIQ-01) */}
      <SpotlightModal />

      {/* Tarjetas Adhesivas Flotantes Web/RAG (HU-AIQ-02) */}
      <StickyNotesOverlay />

      <SpotlightTour
        steps={PRESENTATION_GUIDE_STEPS}
        open={isGuideOpen}
        onClose={closeGuide}
      />
    </div>
  );
};
