import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  BookOpen,
  ArrowLeft,
  FileText,
  Layers,
  Bot,
  CornerDownLeft,
  Square,
  Cpu,
  AlertTriangle,
  Globe,
  ExternalLink,
  Download,
  Trash2,
  HelpCircle,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { RobotAvatar } from './RobotAvatar';
import { AccessibilityControls } from './AccessibilityControls';
import { SourceDocument } from './SourceDocument';
import { PdfHighlightViewer } from './PdfHighlightViewer';
import { parseNotesBlocks, extractNotesTitle } from '../lib/notes';
import { SHOW_INTERNAL_STATUS } from '../lib/publicMode';
import {
  buildChatMarkdown,
  buildNotesMarkdown,
  downloadText,
  fileStamp,
  slugify
} from '../lib/sessionExport';
import { ChatSource, HighlightBbox } from '../types';
import { ASSISTANT_NAME } from '../lib/brand';
import { SpotlightTour, TourStep } from './SpotlightTour';
import { hasSeenGuide, markGuideSeen } from '../lib/guideSeen';

type RightTab = 'documento' | 'fragmentos' | 'web';
type StudyCell = 'ai' | 'pdf' | 'slide';

interface FocusTarget {
  id: string;
  title?: string;
  content?: string;
  pagina?: number;
  bbox?: HighlightBbox;
  source?: 'local' | 'web';
}

const STUDY_GUIDE_STEPS: TourStep[] = [
  {
    selector: '[data-tour="study-assistant"]',
    title: 'Asistente de Estudio',
    description:
      'Aquí puedes hacer preguntas sobre el tema y leer las respuestas basadas en el material. Escribe abajo y pulsa Enter para enviar (o Shift + Enter para saltar de línea).'
  },
  {
    selector: '[data-tour="study-pdf"]',
    title: 'Documento PDF',
    description:
      'Aquí ves el documento original del módulo. Puedes cambiar de página, hacer scroll dentro del texto o pulsar Ampliar para leerlo con más espacio.'
  },
  {
    selector: '[data-tour="study-slide"]',
    title: 'Lámina y teclado',
    description:
      'Abajo tienes la lámina a todo lo ancho para leerla con comodidad. Si haces clic o scroll en un bloque, podrás moverte con las flechas del teclado; y cuando quieras, pulsa Salir para cerrar esta guía.'
  }
];

export const P03_NotebookLM: React.FC = () => {
  const {
    selectedTopic,
    currentSlideIndex,
    goToSlide,
    nextSlide,
    prevSlide,
    setCurrentView,
    chatMessages,
    sendChatMessage,
    isSearching,
    robotMood,
    setRobotMood,
    setActiveHighlightBlockId,
    setActiveHighlightPdfTarget,
    activeHighlightBlockId,
    activeHighlightPage,
    latestChatSources,
    stopChatStream,
    clearChat,
    loadLlmStatus,
    llmStatus
  } = usePresentationStore();

  const [inputMessage, setInputMessage] = useState('');
  const [rightTab, setRightTab] = useState<RightTab>('documento');
  // En el Modo de Estudio el PDF es la fuente principal; las notas Markdown
  // siguen disponibles desde un control discreto dentro de la celda.
  const [documentView, setDocumentView] = useState<'notes' | 'pdf'>('pdf');
  // El foco inicial es el asistente, no la lámina: al entrar se ve la parte
  // superior del modo y el teclado no cambia de diapositiva por accidente.
  const [activeCell, setActiveCell] = useState<StudyCell>('ai');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [pdfExpanded, setPdfExpanded] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const pdfCellRef = useRef<HTMLElement>(null);
  const studyRootRef = useRef<HTMLDivElement>(null);
  /** true en cuanto el usuario interactúa con el scroll; deja de fijar arriba. */
  const userScrolledRef = useRef(false);

  const closeGuide = useCallback(() => {
    setIsGuideOpen(false);
    markGuideSeen('study');
  }, []);

  // Se muestra una sola vez por vista; siempre se puede reabrir desde "? Guía".
  useEffect(() => {
    if (hasSeenGuide('study')) return;
    const timer = window.setTimeout(() => {
      if (!hasSeenGuide('study')) setIsGuideOpen(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

  // Estado del proveedor LLM (para indicar si hay generación real o modo extractivo)
  useEffect(() => {
    loadLlmStatus();
  }, [loadLlmStatus]);

  // Auto-scroll SOLO del área de conversación: nunca desplaza la página
  // mientras el usuario está leyendo la diapositiva o el PDF.
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chatMessages, isSearching]);

  // Reconstrucción del texto base (módulos con notas Markdown)
  const rawMarkdown = selectedTopic?.notes_markdown ?? '';
  const notesBlocks = useMemo(() => parseNotesBlocks(rawMarkdown), [rawMarkdown]);
  const notesTitle = useMemo(() => extractNotesTitle(rawMarkdown), [rawMarkdown]);

  // Al cambiar de módulo volvemos a la pestaña del documento
  useEffect(() => {
    setRightTab('documento');
    setDocumentView('pdf');
    setActiveCell('ai');
    setIsGuideOpen(false);
    setPdfExpanded(false);
  }, [selectedTopic?.id]);

  // Al entrar (o cambiar de módulo) empezamos arriba y mantenemos el scroll
  // fijado mientras llegan las páginas del PDF y el resto de la rejilla.
  useLayoutEffect(() => {
    userScrolledRef.current = false;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [selectedTopic?.id]);

  useEffect(() => {
    const root = studyRootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return;

    const pinToTop = () => {
      if (userScrolledRef.current) return;
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    const observer = new ResizeObserver(pinToTop);
    observer.observe(root);
    const frame = window.requestAnimationFrame(pinToTop);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [selectedTopic?.id]);

  // Detectamos intención real del usuario (rueda/táctil/teclas de scroll), no
  // eventos `scroll` provocados por el navegador al reajustar el layout.
  useEffect(() => {
    const markUserScroll = () => {
      userScrolledRef.current = true;
    };
    const scrollKeys = new Set([
      'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'
    ]);
    const onKeyDown = (event: KeyboardEvent) => {
      if (scrollKeys.has(event.key)) markUserScroll();
    };

    window.addEventListener('wheel', markUserScroll, { passive: true });
    window.addEventListener('touchmove', markUserScroll, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', markUserScroll);
      window.removeEventListener('touchmove', markUserScroll);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  // Si una cita activa un bloque o una página, mostramos el documento
  useEffect(() => {
    if (activeHighlightBlockId || activeHighlightPage) {
      setRightTab('documento');
    }
    // Una cita con página/bbox (HU-NOT-02) solo se puede resaltar en el PDF.
    if (activeHighlightPage) {
      setDocumentView('pdf');
    } else if (activeHighlightBlockId) {
      setDocumentView('notes');
    }
  }, [activeHighlightBlockId, activeHighlightPage]);

  // Desplazamiento al bloque citado cuando el foco llega desde el chat
  useEffect(() => {
    if (rightTab !== 'documento' || !activeHighlightBlockId) return;
    const timer = setTimeout(() => {
      document
        .getElementById(`p03-${activeHighlightBlockId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 180);
    return () => clearTimeout(timer);
  }, [activeHighlightBlockId, rightTab]);

  if (!selectedTopic) return null;

  const currentSlide = selectedTopic.slides[currentSlideIndex];
  const hasMarkdownNotes = notesBlocks.length > 0;
  const hasPdf = Boolean(selectedTopic.files?.pdf);
  const showPdf = hasPdf && documentView === 'pdf';

  // Borde salvia de alto contraste: el foco se nota sin sombras difusas.
  const activeCellClass = 'active-cell';
  // Misma altura para las tres celdas: al ampliar el PDF crecen juntas
  // la IA y la lámina, conservando el aspecto de celda combinada.
  const studyRowHeight = pdfExpanded
    ? 'h-[min(82vh,900px)]'
    : 'h-[clamp(520px,62vh,680px)]';
  const activeChip = (cell: StudyCell) =>
    activeCell === cell ? (
      <span className="shrink-0 rounded-full border border-[#778d7a]/60 bg-[#778d7a]/15 px-1.5 py-0.5 text-[10px] font-semibold text-slate-100">
        Activa
      </span>
    ) : null;

  // Exportación local (sin backend) para que siga funcionando sin conexión.
  const exportBaseName = `${slugify(selectedTopic.title)}-${fileStamp()}`;

  const handleExportChat = () => {
    downloadText(
      `chat-${exportBaseName}.md`,
      buildChatMarkdown(selectedTopic, chatMessages)
    );
  };

  const handleExportNotes = () => {
    downloadText(
      `notas-${exportBaseName}.md`,
      buildNotesMarkdown(selectedTopic)
    );
  };

  const handleClearChat = () => {
    if (chatMessages.length <= 1) return;
    if (
      !window.confirm(
        '¿Vaciar la conversación de este módulo? El resto de la sesión (bitácora, notas y tema elegido) se conserva.'
      )
    ) {
      return;
    }
    clearChat();
  };

  const localChatSources = latestChatSources.filter((s) => s.source !== 'web');
  const webChatSources = latestChatSources.filter((s) => s.source === 'web');

  // Fuentes web de la última respuesta (aunque el chat ya haya empezado otra)
  const lastAssistantWithWeb = [...chatMessages]
    .reverse()
    .find(
      (m) =>
        m.sender === 'assistant' &&
        ((m.sources ?? []).some((s) => s.source === 'web') || (m.webResults?.length ?? 0) > 0)
    );

  const webDisplaySources: ChatSource[] =
    webChatSources.length > 0
      ? webChatSources
      : (lastAssistantWithWeb?.sources ?? []).filter((s) => s.source === 'web').length > 0
        ? (lastAssistantWithWeb?.sources ?? []).filter((s) => s.source === 'web')
        : (lastAssistantWithWeb?.webResults ?? []).map((r) => ({
            id: r.id,
            title: r.title,
            content: r.snippet ?? '',
            excerpt: r.snippet,
            source: 'web',
            url: r.url,
            provider: r.provider
          }));

  // En la pestaña Fragmentos mostramos lo recuperado por RAG; si aún no hay
  // consulta, el índice completo de bloques del texto base.
  const fragmentSources: FocusTarget[] =
    localChatSources.length > 0
      ? localChatSources.map((s) => ({
          id: s.id,
          title: s.title,
          content: s.excerpt || s.content,
          pagina: s.pagina,
          bbox: s.bbox,
          source: 'local'
        }))
      : notesBlocks.map((b) => ({
          id: b.id,
          title: b.title,
          content: b.content,
          source: 'local'
        }));

  const citedIds = new Set(
    localChatSources.filter((s) => s.cited).map((s) => s.id)
  );

  // Vista previa en texto plano para las tarjetas de fragmentos.
  const plainPreview = (text?: string) =>
    (text ?? '')
      .replace(/###\s*/g, '')
      .replace(/[*_`#>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  // Lleva el foco al fragmento correcto según el tipo de módulo:
  // PDF -> página + bbox; Markdown -> bloque resaltado.
  const focusSource = (source: FocusTarget) => {
    if (source.source === 'web') {
      setRightTab('web');
      return;
    }

    setRightTab('documento');
    setRobotMood('apuntar_puntero', 1800);

    if (source.pagina) {
      setDocumentView('pdf');
      setActiveHighlightPdfTarget(source.pagina, source.bbox ?? null);
      return;
    }

    setDocumentView('notes');
    setActiveHighlightBlockId(source.id);
    setTimeout(() => {
      document
        .getElementById(`p03-${source.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 160);
  };

  const submitMessage = async () => {
    if (!inputMessage.trim() || isSearching) return;
    const msg = inputMessage;
    setInputMessage('');
    await sendChatMessage(msg);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    void submitMessage();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envía; Shift + Enter agrega salto de línea. Las flechas se
    // reservan para mover el cursor dentro del campo de escritura.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submitMessage();
    }
  };

  // Marca visualmente la celda activa y evita que una tecla dispare una acción
  // en la zona equivocada.
  const cellInteractionProps = (cell: StudyCell) => ({
    onPointerDown: () => setActiveCell(cell),
    onFocusCapture: () => setActiveCell(cell),
    onWheelCapture: () => setActiveCell(cell)
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const isTyping =
        tag === 'input' || tag === 'textarea' || Boolean(target?.isContentEditable);

      // Regla de seguridad: si el usuario escribe, el teclado es suyo.
      if (isTyping) return;

      if (activeCell === 'slide') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          nextSlide();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          prevSlide();
        }
        return;
      }

      if (activeCell === 'pdf') {
        const scrollsDown =
          e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ';
        const scrollsUp = e.key === 'ArrowUp' || e.key === 'PageUp';
        if (!scrollsDown && !scrollsUp) return;

        const scroller = pdfCellRef.current?.querySelector<HTMLElement>(
          '[data-pdf-scroll]'
        );
        if (!scroller) return;
        e.preventDefault();
        const distance = e.key === 'PageDown' || e.key === 'PageUp'
          ? scroller.clientHeight * 0.9
          : 120;
        scroller.scrollBy({ top: scrollsDown ? distance : -distance, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, nextSlide, prevSlide]);

  return (
    <div
      ref={studyRootRef}
      className="min-h-screen bg-slate-950 text-slate-100 [overflow-anchor:none]"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* 1. Identidad y barra superior del Modo de Estudio */}
        <header className="relative flex flex-col gap-3 border-b border-slate-800/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentView('home')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
            >
              <ArrowLeft className="h-4 w-4 text-cyan-400" />
              Inicio
            </button>

            <div className="hidden h-4 w-[1px] bg-slate-800 sm:block" />

            {/* Logos discreto: acompaña sin globos que tapen contenido. */}
            <span
              className="hidden h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-purple-500/30 bg-purple-500/10 sm:flex"
              title={`${ASSISTANT_NAME} te acompaña en silencio durante el estudio`}
            >
              <RobotAvatar mood={robotMood} size="sm" quiet className="scale-50" />
            </span>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold text-slate-100 sm:text-base">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-300">
                  Modo de Estudio
                </span>
                <span className="mx-1.5 text-slate-600">·</span>
                {selectedTopic.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => setCurrentView('presentation')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
            >
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              Presentación
            </button>
            <AccessibilityControls />
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
              title="Guía rápida del Modo de Estudio"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Guía
            </button>
          </div>
        </header>

      {/* 2. Rejilla principal: mismo ancho y alineación que el Home */}
      <main className="flex-1 space-y-6 pt-5 pb-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Fila superior — Celda izquierda: Asistente de Estudio (IA) */}
          <section
            data-tour="study-assistant"
            {...cellInteractionProps('ai')}
            className={`flex ${studyRowHeight} min-h-0 flex-col overflow-hidden rounded-2xl border bg-slate-900/60 ${
              activeCell === 'ai' ? activeCellClass : 'border-slate-800/80'
            }`}
          >
            {/* Cabecera compacta de la celda */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/50 px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-cyan-400" />
              <h2 className="truncate text-sm font-bold text-slate-200">Asistente de Estudio</h2>
              {activeChip('ai')}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {SHOW_INTERNAL_STATUS && (
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
                    llmStatus?.configured
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }`}
                  title={
                    llmStatus?.configured
                      ? `Generación con ${llmStatus.provider} · ${llmStatus.model}`
                      : 'Configura LLM_API_KEY / LLM_MODEL en el backend para activar la generación'
                  }
                >
                  <Cpu className="h-3.5 w-3.5" />
                </span>
              )}
              <button
                type="button"
                onClick={handleExportChat}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                title="Descargar esta conversación en Markdown"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                disabled={chatMessages.length <= 1}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-amber-500/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                title="Vaciar la conversación de este módulo"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Limpiar</span>
              </button>
            </div>
          </div>

          {/* Área de conversación con scroll interno */}
          <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {msg.sender === 'assistant' ? (
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-cyan-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-purple-300">TÚ</span>
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-850/90 border border-slate-800 text-slate-200 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">
                    {msg.text}
                    {msg.isStreaming && (
                      <span className="inline-block w-2 h-4 ml-0.5 align-middle bg-cyan-400 animate-pulse rounded-sm" />
                    )}
                  </p>

                  {msg.notice && (
                    <p
                      className={`mt-2 text-[11px] italic flex items-start gap-1.5 ${
                        msg.error ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>{msg.notice}</span>
                    </p>
                  )}

                  {/* Fuentes recuperadas y citas del LLM */}
                  {msg.sender === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-wrap items-center gap-1.5">
                      {msg.sources.map((source) => {
                        const isCited = msg.citations?.includes(source.id) || source.cited;
                        const isWeb = source.source === 'web';
                        return isWeb ? (
                          <a
                            key={source.id}
                            href={source.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${source.title}${source.url ? ` — ${source.url}` : ''}`}
                            className={`px-2 py-0.5 rounded border font-mono text-[11px] flex items-center gap-1 transition-colors ${
                              isCited
                                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
                                : 'bg-slate-800/60 border-slate-600/50 text-slate-300 hover:bg-slate-700/60'
                            }`}
                          >
                            <Globe className="w-3 h-3" />
                            #{source.id}
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        ) : (
                          <button
                            key={source.id}
                            onClick={() => focusSource(source)}
                            title={`${source.title}${source.pagina ? ` — página ${source.pagina}` : ''}`}
                            className={`px-2 py-0.5 rounded border font-mono text-[11px] flex items-center gap-1 transition-colors ${
                              isCited
                                ? 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
                                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
                            }`}
                          >
                            <BookOpen className="w-3 h-3" />
                            #{source.id}
                            {source.pagina ? ` · p.${source.pagina}` : ''}
                          </button>
                        );
                      })}

                      {msg.webResults &&
                        msg.webResults.length > 0 &&
                        !msg.sources.some((s) => s.source === 'web') &&
                        msg.webResults.map((result) => (
                          <a
                            key={result.id}
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`${result.title}${result.url ? ` — ${result.url}` : ''}`}
                            className="px-2 py-0.5 rounded border font-mono text-[11px] flex items-center gap-1 bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25"
                          >
                            <Globe className="w-3 h-3" />
                            #{result.id}
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        ))}

                      {msg.mode && (
                        <span className="text-[10px] text-slate-500 font-mono ml-1">
                          {msg.mode === 'llm' ? 'LLM' : 'extractivo'}
                        </span>
                      )}

                      {msg.confidence ? (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Confianza: {Math.round(msg.confidence * 100)}%
                        </span>
                      ) : null}
                    </div>
                  )}

                  <span className="block mt-1 text-[10px] text-slate-400 font-mono text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isSearching && !chatMessages.some((m) => m.isStreaming && m.text.length > 0) && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-center text-xs text-cyan-400 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-cyan-400 animate-spin" />
                </div>
                <span>Recuperando fragmentos del texto base y redactando una respuesta con citas...</span>
              </div>
            )}

          </div>

          {/* Barra para escribir: siempre al pie de la celda de IA */}
          <form onSubmit={handleSend} className="shrink-0 border-t border-slate-800/80 bg-slate-950/70 p-3">
            <div className="relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Escribe tu pregunta sobre el tema..."
                rows={2}
                disabled={isSearching}
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-3 pr-12 text-sm leading-relaxed text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-60"
              />

              {isSearching ? (
                <button
                  type="button"
                  onClick={stopChatStream}
                  title="Detener la generación"
                  className="absolute bottom-2.5 right-2.5 rounded-lg bg-amber-500 p-2 text-slate-950 transition-colors hover:bg-amber-400"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="absolute bottom-2.5 right-2.5 rounded-lg bg-cyan-500 p-2 text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-cyan-500"
                  title="Enviar pregunta"
                >
                  <CornerDownLeft className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-500">
              Enter envía · Shift + Enter salto de línea
            </p>
          </form>
          </section>

          {/* Fila superior — Celda derecha: Documento PDF */}
          <section
            data-tour="study-pdf"
            {...cellInteractionProps('pdf')}
            ref={pdfCellRef}
            className={`flex ${studyRowHeight} min-h-0 flex-col overflow-hidden rounded-2xl border bg-slate-950/70 ${
              activeCell === 'pdf' ? activeCellClass : 'border-slate-800/80'
            }`}
          >
            {/* Barra superior de la celda */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-900/60 px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-cyan-400" />
                <h2 className="truncate text-sm font-bold text-slate-200">Documento PDF</h2>
                {activeChip('pdf')}
                {activeHighlightPage ? (
                  <span className="shrink-0 rounded border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                    Resaltado p.{activeHighlightPage}
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">
                    Sin resaltado
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {hasMarkdownNotes && (
                  <button
                    type="button"
                    onClick={() =>
                      setDocumentView(documentView === 'notes' ? 'pdf' : 'notes')
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                    title="Alternar entre el PDF y las notas Markdown"
                  >
                    {documentView === 'notes' ? 'PDF' : 'Notas'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPdfExpanded((v) => !v)}
                  className="soft-control inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-100"
                  title={pdfExpanded ? 'Restaurar altura del documento' : 'Ampliar el documento'}
                >
                  {pdfExpanded ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {pdfExpanded ? 'Restaurar' : 'Ampliar'}
                  </span>
                </button>
              </div>
            </div>

            {/* Pestañas del panel derecho */}
            <div className="flex shrink-0 items-center gap-1 border-b border-slate-800/60 px-4 pb-2 pt-2.5">
            <button
              onClick={() => setRightTab('documento')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                rightTab === 'documento'
                  ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Documento
            </button>
            <button
              onClick={() => setRightTab('fragmentos')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                rightTab === 'fragmentos'
                  ? 'bg-purple-500/15 border-purple-400/50 text-purple-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Fragmentos
              <span className="font-mono text-[10px] text-slate-400">{fragmentSources.length}</span>
            </button>
            <button
              onClick={() => setRightTab('web')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                rightTab === 'web'
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Web
              {webDisplaySources.length > 0 && (
                <span className="font-mono text-[10px] text-slate-400">
                  {webDisplaySources.length}
                </span>
              )}
            </button>
          </div>

          {/* Contenido de la pestaña activa */}
          <div className="flex-1 min-h-0 px-4 pt-2.5 pb-1 overflow-hidden">
            {rightTab === 'documento' &&
              (showPdf ? (
                <div className="flex h-full min-h-0 flex-col">
                  <PdfHighlightViewer />
                </div>
              ) : hasMarkdownNotes ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                    <span className="truncate text-[11px] font-semibold text-slate-300">
                      {notesTitle ?? 'Texto base del módulo'}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[10px] text-slate-500">
                        {notesBlocks.length} bloques
                      </span>
                      <button
                        type="button"
                        onClick={handleExportNotes}
                        className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                        title="Descargar los apuntes del módulo en Markdown"
                      >
                        <Download className="h-3 w-3" />
                        Exportar
                      </button>
                      {hasPdf && (
                        <button
                          type="button"
                          onClick={() => setDocumentView('pdf')}
                          className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                          title="Ver el PDF original con el mismo resaltado"
                        >
                          PDF original
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1">
                    <SourceDocument
                      blocks={notesBlocks}
                      activeBlockId={activeHighlightBlockId}
                      idPrefix="p03-"
                      onSelectBlock={(id) =>
                        focusSource({ id, title: id, source: 'local' })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-slate-500">
                  <FileText className="h-7 w-7 text-slate-600" />
                  <p className="text-xs leading-relaxed">
                    Este módulo no tiene PDF ni notas Markdown disponibles todavía.
                    Sube el material a Supabase Storage o usa el botón Sincronizar.
                  </p>
                </div>
              ))}

            {rightTab === 'fragmentos' && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-2 flex shrink-0 items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-[11px] font-semibold text-slate-300">
                    {localChatSources.length > 0
                      ? 'Fragmentos recuperados por RAG'
                      : 'Índice de bloques del texto base'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {fragmentSources.length} bloques
                  </span>
                </div>

                {fragmentSources.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center text-slate-500">
                    <FileText className="h-7 w-7 text-slate-600" />
                    <p className="text-xs leading-relaxed">
                      Aún no hay fragmentos recuperados. Haz una pregunta al asistente y aquí
                      aparecerán las fuentes del texto base que sustentan la respuesta.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                    {fragmentSources.map((fragment) => {
                      const isActive = fragment.id === activeHighlightBlockId;
                      const isCited = citedIds.has(fragment.id);

                      return (
                        <button
                          key={fragment.id}
                          onClick={() => focusSource(fragment)}
                          className={`w-full rounded-xl border p-3 text-left text-xs transition-all ${
                            isActive
                              ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/10'
                              : 'border-slate-800/80 bg-slate-900/70 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className="truncate font-bold text-slate-200">
                              {fragment.title ?? fragment.id}
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                              {fragment.pagina ? (
                                <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">
                                  p.{fragment.pagina}
                                </span>
                              ) : null}
                              {isCited ? (
                                <span className="rounded border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] text-amber-300">
                                  citada
                                </span>
                              ) : null}
                              <span className="rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400">
                                #{fragment.id}
                              </span>
                            </div>
                          </div>
                          <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-400">
                            {plainPreview(fragment.content) || fragment.title || fragment.id}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {rightTab === 'web' && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="mb-2 flex shrink-0 items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-[11px] font-semibold text-slate-300">
                    Fuentes Web Externas
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {webDisplaySources.length}
                  </span>
                </div>

                {webDisplaySources.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center text-slate-500">
                    <Globe className="h-7 w-7 text-slate-600" />
                    <p className="text-xs leading-relaxed">
                      No hay fuentes web en esta conversación. Cuando una pregunta no esté en el
                      texto base y la búsqueda web esté configurada, aquí verás los enlaces reales
                      usados para complementar la respuesta.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
                    {webDisplaySources.map((source) => (
                      <a
                        key={source.id}
                        href={source.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={source.title}
                        className="block rounded-lg border border-emerald-500/25 bg-emerald-950/20 p-2 text-[11px] transition-colors hover:bg-emerald-900/30"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-emerald-200">
                            {source.title}
                          </span>
                          <span className="shrink-0 rounded border border-slate-800 bg-slate-950 px-1.5 py-0.5 font-mono text-[9px] text-emerald-300">
                            #{source.id}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-slate-400">
                          {source.excerpt || source.content}
                        </p>
                        <p className="mt-1 flex items-center gap-1 truncate text-[9px] text-emerald-400/80">
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          {source.url}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          </section>

          {/* Fila inferior — Celda combinada a lo ancho: Diapositiva */}
          <section
            data-tour="study-slide"
            {...cellInteractionProps('slide')}
            className={`col-span-full flex w-full min-w-0 ${studyRowHeight} flex-col overflow-hidden rounded-2xl border bg-slate-900/50 ${
              activeCell === 'slide' ? activeCellClass : 'border-slate-800/80'
            }`}
          >
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 bg-slate-950/50 px-4 py-2.5 sm:px-5">
              <div className="flex min-w-0 items-center gap-2">
                <Layers className="h-4 w-4 shrink-0 text-cyan-400" />
                <h2 className="truncate text-sm font-bold text-slate-200">
                  Lámina {currentSlide.number} · Ancho completo
                </h2>
                {activeChip('slide')}
              </div>
              <span className="shrink-0 font-mono text-[11px] text-cyan-400">
                Lámina {currentSlideIndex + 1} de {selectedTopic.slides.length}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              <span className="inline-block rounded border border-cyan-800/40 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                {currentSlide.tag}
              </span>
              <h3 className="mt-3 text-xl font-bold leading-snug text-slate-100 sm:text-2xl">
                {currentSlide.title}
              </h3>
              <p className="mt-1.5 text-sm font-medium text-cyan-300">
                {currentSlide.headline}
              </p>

              <ul className="mt-4 space-y-2.5">
                {currentSlide.bullet_points.map((bp, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
                    <span>{bp}</span>
                  </li>
                ))}
              </ul>

              {currentSlide.code_snippet && (
                <pre className="mt-5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300">
                  <code>{currentSlide.code_snippet}</code>
                </pre>
              )}

              {currentSlide.speaker_notes && (
                <p className="mt-5 border-t border-slate-800 pt-3 text-xs italic leading-relaxed text-slate-500">
                  {currentSlide.speaker_notes}
                </p>
              )}
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 bg-slate-950/60 px-4 py-3">
              <button
                type="button"
                onClick={prevSlide}
                disabled={currentSlideIndex === 0}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </button>

              <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-x-auto px-2 pb-1">
                {selectedTopic.slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    title={s.title}
                    className={`shrink-0 rounded-lg border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                      idx === currentSlideIndex
                        ? 'border-cyan-400 bg-cyan-500/20 font-bold text-cyan-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {s.number}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={nextSlide}
                disabled={currentSlideIndex === selectedTopic.slides.length - 1}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-cyan-500/50 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      </main>

        <SpotlightTour
          steps={STUDY_GUIDE_STEPS}
          open={isGuideOpen}
          onClose={closeGuide}
        />
      </div>
    </div>
  );
};
