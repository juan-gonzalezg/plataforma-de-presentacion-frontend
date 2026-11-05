import React, { useState, useRef, useEffect } from 'react';
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
    latestChatSources,
    stopChatStream,
    loadLlmStatus,
    llmStatus
  } = usePresentationStore();

  const [inputMessage, setInputMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [selectedBlockDetail, setSelectedBlockDetail] = useState<string | null>(null);

  // Estado del proveedor LLM (para indicar si hay generación real o modo extractivo)
  useEffect(() => {
    loadLlmStatus();
  }, [loadLlmStatus]);

  // Auto-scroll del chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isSearching]);

  if (!selectedTopic) return null;

  const currentSlide = selectedTopic.slides[currentSlideIndex];

  // Extraer bloques de notas para la columna de fuentes documentales
  // (aplica solo a temas con notes_markdown; los módulos basados en PDF
  // muestran esta columna vacía por ahora — ver nota de seguimiento)
  const rawMarkdown = selectedTopic.notes_markdown ?? '';
  const blocksPattern = /<div\s+id="([^"]+)"[^>]*>(.*?)<\/div>/gs;
  const sourceBlocks: { id: string; title: string; content: string }[] = [];
  let match;
  while ((match = blocksPattern.exec(rawMarkdown)) !== null) {
    const raw = match[2].trim();
    const titleMatch = /###\s*([^\n]+)/.exec(raw);
    sourceBlocks.push({
      id: match[1],
      title: titleMatch ? titleMatch[1].trim() : `Sección ${match[1]}`,
      content: raw.replace(/###\s*[^\n]+/, '').replace(/[\*\_#`]/g, '').trim()
    });
  }

  const webDisplaySources = latestChatSources.filter((s) => s.source === 'web');
  const localChatSources = latestChatSources.filter((s) => s.source !== 'web');

  // Si el módulo no tiene notas Markdown (p. ej. PDFs de Supabase), mostramos
  // las fuentes recuperadas por el RAG durante la conversación. Si ya hubo una
  // consulta, priorizamos esos fragmentos (con su marca de "citada"); si no,
  // mostramos el índice completo de notas del módulo.
  const displaySources: {
    id: string;
    title: string;
    content: string;
    pagina?: number;
    cited?: boolean;
  }[] = localChatSources.length > 0 ? localChatSources : sourceBlocks;

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
        
        {/* COLUMNA IZQUIERDA: Hilo de Chat con la IA (6 columnas) */}
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
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                RAG + citas
              </span>
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
                            onClick={() => {
                              setSelectedBlockDetail(source.id);
                              setActiveHighlightBlockId(source.id);
                              document
                                .getElementById(`source-${source.id}`)
                                ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                            title={source.title}
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

                      {msg.webResults && msg.webResults.length > 0 && !msg.sources.some((s) => s.source === 'web') && (
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
                        ))
                      )}

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

        {/* COLUMNA DERECHA: Lámina Minimizada + Fuentes Documentales & Cuartel del Robot (5 columnas) */}
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

          {/* Columna Derecha Inf: Fuentes Documentales & Cuartel del Robot */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" /> Fuentes Documentales{" "}
                {sourceBlocks.length > 0 ? "(RAG Markdown)" : "(RAG en vivo)"}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {displaySources.length} bloques
              </span>
            </div>

            {/* Lista de Fuentes RAG */}
            {displaySources.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-5 gap-2 text-slate-500 mb-3">
                <FileText className="w-7 h-7 text-slate-600" />
                <p className="text-xs leading-relaxed">
                  Aún no hay fragmentos recuperados. Haz una pregunta al asistente y aquí
                  aparecerán las fuentes del texto base que sustentan la respuesta.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
                {displaySources.map((b) => (
                  <div
                    key={b.id}
                    id={`source-${b.id}`}
                    onClick={() => setSelectedBlockDetail(selectedBlockDetail === b.id ? null : b.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedBlockDetail === b.id
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-slate-200 truncate">{b.title}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {b.pagina ? (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            p.{b.pagina}
                          </span>
                        ) : null}
                        {b.cited ? (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/40">
                            citada
                          </span>
                        ) : null}
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                          #{b.id}
                        </span>
                      </div>
                    </div>
                    <p
                      className={`text-[11px] leading-relaxed ${
                        selectedBlockDetail === b.id
                          ? 'text-slate-300 whitespace-pre-wrap'
                          : 'text-slate-400 line-clamp-2'
                      }`}
                    >
                      {b.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Fuentes web reales usadas para complementar la respuesta */}
            {webDisplaySources.length > 0 && (
              <div className="shrink-0 mb-3 border-t border-slate-800 pt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" /> Fuentes Web Externas
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {webDisplaySources.length}
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {webDisplaySources.map((source) => (
                    <a
                      key={source.id}
                      href={source.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={source.title}
                      className="block p-2 rounded-lg border border-emerald-500/25 bg-emerald-950/20 hover:bg-emerald-900/30 text-[11px] transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-emerald-200 font-semibold truncate">
                          {source.title}
                        </span>
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300 border border-slate-800 shrink-0">
                          #{source.id}
                        </span>
                      </div>
                      <p className="text-slate-400 line-clamp-2 mt-0.5">{source.content}</p>
                      <p className="text-[9px] text-emerald-400/80 truncate mt-1 flex items-center gap-1">
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                        {source.url}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* CUARTEL DEL ROBOT: Buscador Bibliotecario Fijo */}
            <div className="p-3 bg-slate-900/90 border border-purple-500/30 rounded-2xl flex items-center gap-3 shrink-0 shadow-lg">
              <RobotAvatar
                mood={robotMood}
                size="sm"
                onClick={() => setRobotMood('buscar_antena', 1500)}
              />
              <div className="text-xs">
                <p className="font-bold text-purple-300">Cuartel del Robot: Bibliotecario</p>
                <p className="text-[11px] text-slate-400">
                  {displaySources.length > 0
                    ? `Mostrando ${displaySources.length} fragmentos recuperados del texto base.`
                    : 'Esperando una consulta para recuperar fragmentos del texto base.'}
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
