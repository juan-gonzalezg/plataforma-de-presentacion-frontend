import React, { useEffect } from 'react';
import { 
  Play, 
  Clock, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  Cloud, 
  Brain, 
  ShieldCheck, 
  ArrowRight,
  Database,
  Download,
  Loader2,
  BookOpen,
  RefreshCw
} from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { RobotAvatar } from './RobotAvatar';
import { AccessibilityControls } from './AccessibilityControls';

export const P01_Home: React.FC = () => {
  const { 
    topics, 
    loadTopics, 
    refreshTopics,
    selectTopic, 
    isLoadingTopics, 
    isLoadingTopicDetail,
    robotMood,
    setRobotMood,
    setRobotSpeech,
    downloadTopicMaterial
  } = usePresentationStore();

  const [downloadingTopicId, setDownloadingTopicId] = React.useState<string | null>(null);

  const handleDownloadMaterial = async (e: React.MouseEvent, topicId: string, topicTitle: string) => {
    e.stopPropagation();
    if (downloadingTopicId) return;

    setDownloadingTopicId(topicId);
    setRobotSpeech(`Preparando descarga del material (${topicTitle})...`, 3000);

    try {
      const res = await downloadTopicMaterial(topicId, 'pdf');
      if (res) {
        setRobotSpeech('¡Descarga iniciada con éxito! Revisa tu navegador.', 3500);
      } else {
        setRobotSpeech('No se pudo completar la descarga en este momento.', 3500);
      }
    } catch (err) {
      console.error('Error al descargar:', err);
      setRobotSpeech('Error de conexión al solicitar el archivo.', 3500);
    } finally {
      setDownloadingTopicId(null);
    }
  };

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const getTopicIcon = (iconName: string) => {
    switch (iconName) {
      case 'cloud':
        return <Cloud className="w-8 h-8 text-cyan-400" />;
      case 'brain':
        return <Brain className="w-8 h-8 text-purple-400" />;
      case 'shield':
        return <ShieldCheck className="w-8 h-8 text-emerald-400" />;
      case 'book':
        return <BookOpen className="w-8 h-8 text-amber-400" />;
      default:
        return <Layers className="w-8 h-8 text-cyan-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden">
      {/* Luces de fondo decorativas */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header superior */}
      <header className="flex items-center justify-between z-10 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-100 uppercase">
              Presentación Interactiva <span className="text-cyan-400">&</span> Asistente RAG
            </h1>
            <p className="text-xs text-slate-400">
              Plataforma Educativa con Robot 2D y Documento de Notas Vivas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => refreshTopics()}
            disabled={isLoadingTopics}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-850 border border-cyan-500/40 text-xs text-cyan-300 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Sincronizar y escanear presentaciones en Supabase Storage"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingTopics ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sincronizar Supabase</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/30 text-xs text-emerald-300">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>RAG Vectorial Listo</span>
          </div>
          <AccessibilityControls />
        </div>
      </header>

      {/* Hero Central con Robot y Título */}
      <main className="my-auto py-10 z-10 flex flex-col items-center max-w-5xl mx-auto w-full">
        {/* Robot saludando */}
        <div className="mb-6 flex flex-col items-center">
          <RobotAvatar
            mood={robotMood}
            size="hero"
            speechBubble="¡Hola! Soy tu asistente de presentación. Elige un módulo para comenzar."
            onClick={() => setRobotMood('celebrar', 1500)}
          />
        </div>

        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
            Selecciona el Módulo Educativo de la Sesión
          </h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto">
            Cada módulo incluye diapositivas interactivas, notas técnicas en Markdown indexadas semánticamente y asistente para preguntas contextuales en vivo.
          </p>
        </div>

        {/* Grilla de Temas (Épica 1: HU-HOM-01) */}
        {isLoadingTopics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {topics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => !isLoadingTopicDetail && selectTopic(topic.id)}
                className="group relative bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Icono y Categoría */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 group-hover:scale-110 transition-transform">
                      {getTopicIcon(topic.icon)}
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-full border border-cyan-800/40">
                      {topic.category.split('&')[0].trim()}
                    </span>
                  </div>

                  {/* Título y Descripción */}
                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors mb-2">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-4">
                    {topic.summary}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {topic.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Botón Descargar Material */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={(e) => handleDownloadMaterial(e, topic.id, topic.title)}
                    disabled={downloadingTopicId === topic.id}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-950/90 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 text-xs font-semibold text-slate-300 hover:text-cyan-300 transition-all shadow-sm group/btn cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Descargar presentación de ${topic.title} (PDF)`}
                  >
                    {downloadingTopicId === topic.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                        <span>Descargando...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-cyan-400 group-hover/btn:scale-110 transition-transform" />
                        <span>Descargar material</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Footer de la Tarjeta */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      {topic.slides_count} láminas
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {topic.estimated_minutes} min
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500 text-cyan-400 group-hover:text-slate-950 flex items-center justify-center transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer con atajos de ayuda */}
      <footer className="z-10 border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <p>
          Control de la sesión optimizado para proyector y atajos de teclado rápidos (<kbd className="font-mono text-slate-400">Flechas</kbd>, <kbd className="font-mono text-slate-400">N</kbd>, <kbd className="font-mono text-slate-400">Q</kbd>, <kbd className="font-mono text-slate-400">Esc</kbd>).
        </p>
        <span className="text-slate-400 font-mono">v1.0.0 • React + FastAPI RAG</span>
      </footer>
    </div>
  );
};
