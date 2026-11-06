import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { RobotAvatar } from './RobotAvatar';
import { AccessibilityControls } from './AccessibilityControls';
import { SourceDocument } from './SourceDocument';
import { PdfHighlightViewer } from './PdfHighlightViewer';
import { parseNotesBlocks, extractNotesTitle } from '../lib/notes';
import { ChatSource, HighlightBbox } from '../types';

type RightTab = 'documento' | 'fragmentos' | 'web';

interface FocusTarget {
  id: string;
  title?: string;
  content?: string;
  pagina?: number;
  bbox?: HighlightBbox;
  source?: 'local' | 'web';
}

export const P03_NotebookLM: React.FC = () => {
  const {
    selectedTopic,
    currentSlideIndex,
    goToSlide,
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
    loadLlmStatus,
    llmStatus
  } = usePresentationStore();

  const [inputMessage, setInputMessage] = useState('');
  const [rightTab, setRightTab] = useState<RightTab>('documento');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Estado del proveedor LLM (para indicar si hay generación real o modo extractivo)
  useEffect(() => {
    loadLlmStatus();
  }, [loadLlmStatus]);

  // Auto-scroll del chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSearching]);

  // Reconstrucción del texto base (módulos con notas Markdown)
  const rawMarkdown = selectedTopic?.notes_markdown ?? '';
  const notesBlocks = useMemo(() => parseNotesBlocks(rawMarkdown), [rawMarkdown]);
  const notesTitle = useMemo(() => extractNotesTitle(rawMarkdown), [rawMarkdown]);

  // Al cambiar de módulo volvemos a la pestaña del documento
  useEffect(() => {
    setRightTab('documento');
  }, [selectedTopic?.id]);

  // Si una cita activa un bloque o una página, mostramos el documento
  useEffect(() => {
    if (activeHighlightBlockId || activeHighlightPage) {
      setRightTab('documento');
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
      setActiveHighlightPdfTarget(source.pagina, source.bbox ?? null);
      return;
    }

    setActiveHighlightBlockId(source.id);
    setTimeout(() => {
      document
        .getElementById(`p03-${source.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 160);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSearching) return;
    const msg = inputMessage;
    setInputMessage('');
    await sendChatMessage(msg);
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Barra Superior NotebookLM */}
      <header className="h-14 px-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('presentation')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Volver a Presentación</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-purple-500/20 text-purple-300 font-mono text-[11px] uppercase font-bold tracking-wider">
              Modo NotebookLM
            </span>
            <span className="text-xs font-bold text-slate-200 truncate max-w-sm">
              {selectedTopic.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AccessibilityControls />
        </div>
      </header>

      {/* Cuerpo Principal de Pantalla Dividida (Wireframe Vista 2) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* COLUMNA IZQUIERDA: Hilo de Chat con la IA (7 columnas) */}
        <section className="lg:col-span-7 flex flex-col h-full border-r border-slate-800/80 bg-slate-900/50">
          {/* Header del Chat */}
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-slate-200">Conversación Contextual con IA</h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-1 rounded-full border flex items-center gap-1 ${
                  llmStatus?.configured
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
                title={
                  llmStatus?.configured
                    ? `Generación con ${llmStatus.provider} · ${llmStatus.model}`
                    : 'Configura LLM_API_KEY / LLM_MODEL en el backend para activar la generación'
                }
              >
                <Cpu className="w-3 h-3" />
                {llmStatus
                  ? llmStatus.configured
                    ? llmStatus.model
                    : 'Modo extractivo'
                  : 'Verificando motor...'}
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">RAG + citas</span>
            </div>
          </div>

          {/* Mensajes del Chat */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
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

            <div ref={chatBottomRef} />
          </div>

          {/* Formulario de Pregunta del Chat */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950/80">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Pregúntale a la IA sobre las fuentes o profundiza en cualquier lámina..."
                disabled={isSearching}
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl pl-4 pr-12 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
              />

              {isSearching ? (
                <button
                  type="button"
                  onClick={stopChatStream}
                  title="Detener la generación"
                  className="absolute right-2.5 p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md shadow-amber-500/20"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="absolute right-2.5 p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20"
                >
                  <CornerDownLeft className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </section>

        {/* COLUMNA DERECHA: Lámina Minimizada + Documento/Fuentes + Robot (5 columnas) */}
        <section className="lg:col-span-5 flex flex-col h-full bg-slate-950/90 overflow-hidden">
          {/* Columna Derecha Sup: Lámina Activa Minimizada */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Lámina Referencial Minimizada
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                #{currentSlide.number} / {selectedTopic.slides.length}
              </span>
            </div>

            {/* Miniatura maquetada de la lámina */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs shadow-inner space-y-1.5">
              <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40 inline-block">
                {currentSlide.tag}
              </span>
              <h4 className="font-bold text-slate-100 text-sm">{currentSlide.title}</h4>
              <p className="text-xs text-cyan-400 font-medium">{currentSlide.headline}</p>
              <ul className="text-[11px] text-slate-400 space-y-1 pt-1 list-disc pl-4">
                {currentSlide.bullet_points.slice(0, 2).map((bp, i) => (
                  <li key={i}>{bp}</li>
                ))}
              </ul>
            </div>

            {/* Selector rápido de lámina */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1">
              {selectedTopic.slides.map((s, idx) => (
                <button
                  key={s.id}
                  onClick={() => goToSlide(idx)}
                  className={`text-[10px] px-2 py-1 rounded font-mono border transition-all ${
                    idx === currentSlideIndex
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  L{s.number}
                </button>
              ))}
            </div>
          </div>

          {/* Pestañas del panel derecho */}
          <div className="flex items-center gap-1 px-4 pt-3 shrink-0">
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
              (hasMarkdownNotes ? (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="mb-2 flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                    <span className="truncate text-[11px] font-semibold text-slate-300">
                      {notesTitle ?? 'Texto base del módulo'}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-slate-500">
                      {notesBlocks.length} bloques
                    </span>
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
                <PdfHighlightViewer />
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

          {/* CUARTEL DEL ROBOT: Buscador Bibliotecario Fijo */}
          <div className="p-3 shrink-0">
            <div className="flex items-center gap-3 rounded-2xl border border-purple-500/30 bg-slate-900/90 p-3 shadow-lg">
              <RobotAvatar
                mood={robotMood}
                size="sm"
                onClick={() => setRobotMood('buscar_antena', 1500)}
              />
              <div className="text-xs">
                <p className="font-bold text-purple-300">Cuartel del Robot: Bibliotecario</p>
                <p className="text-[11px] text-slate-400">
                  {rightTab === 'documento'
                    ? hasMarkdownNotes
                      ? `Documento continuo con ${notesBlocks.length} bloques anclados al RAG.`
                      : activeHighlightPage
                        ? `Visor PDF enfocado en la página ${activeHighlightPage}.`
                        : 'Visor del PDF oficial del módulo.'
                    : rightTab === 'fragmentos'
                      ? `${fragmentSources.length} fragmentos del texto base disponibles.`
                      : webDisplaySources.length > 0
                        ? `${webDisplaySources.length} fuentes web externas citadas.`
                        : 'Sin fuentes web en esta conversación.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
