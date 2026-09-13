import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  BookOpen, 
  ArrowLeft, 
  ExternalLink, 
  FileText, 
  Layers, 
  Bot, 
  Globe, 
  CornerDownLeft,
  Search,
  CheckCircle2
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
    setRobotMood
  } = usePresentationStore();

  const [inputMessage, setInputMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [selectedBlockDetail, setSelectedBlockDetail] = useState<string | null>(null);

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
            <span className="text-xs text-slate-400 font-mono">
              Basado en notas Markdown + RAG Híbrido
            </span>
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
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Metadatos y Citas de la IA */}
                  {msg.sender === 'assistant' && (msg.target_block_id || msg.external_url) && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/60 text-xs flex flex-wrap items-center gap-2">
                      {msg.target_block_id && (
                        <button
                          onClick={() => setSelectedBlockDetail(msg.target_block_id!)}
                          className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <BookOpen className="w-3 h-3" /> Cita Oficial: #{msg.target_block_id}
                        </button>
                      )}

                      {msg.external_url && (
                        <a
                          href={msg.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <Globe className="w-3 h-3" /> Fuente Externa Web
                        </a>
                      )}

                      {msg.confidence && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Similitud: {Math.round(msg.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  )}

                  <span className="block mt-1 text-[10px] text-slate-400 font-mono text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isSearching && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-center text-xs text-cyan-400 animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-cyan-400 animate-spin" />
                </div>
                <span>El asistente está consultando las notas y analizando la mejor respuesta...</span>
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

              <button
                type="submit"
                disabled={!inputMessage.trim() || isSearching}
                className="absolute right-2.5 p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-slate-950 font-bold transition-all shadow-md shadow-cyan-500/20"
              >
                <CornerDownLeft className="w-4 h-4" />
              </button>
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
                <FileText className="w-3.5 h-3.5 text-purple-400" /> Fuentes Documentales (RAG Markdown)
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {sourceBlocks.length} bloques
              </span>
            </div>

            {/* Lista de Fuentes RAG */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-3">
              {sourceBlocks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBlockDetail(selectedBlockDetail === b.id ? null : b.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedBlockDetail === b.id
                      ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-200 truncate">{b.title}</span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                      #{b.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {b.content}
                  </p>
                </div>
              ))}
            </div>

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
                  Indexando {sourceBlocks.length} fragmentos en memoria vectorial local.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
