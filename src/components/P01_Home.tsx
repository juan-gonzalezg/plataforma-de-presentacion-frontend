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
  RefreshCw,
  History,
  RotateCcw,
  AlertTriangle,
  X,
  Trash2
} from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { RobotAvatar } from './RobotAvatar';
import { AccessibilityControls } from './AccessibilityControls';
import {
  clearOfflineCache,
  getOfflineCacheInfo,
  prepareOfflineCache,
  supportsOfflineCache
} from '../lib/offlineCache';
import type { OfflineCacheInfo } from '../lib/offlineCache';
import { ASSISTANT_GREETING, ASSISTANT_NAME } from '../lib/brand';

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
    downloadTopicMaterial,
    systemHealth,
    loadSystemHealth,
    selectedTopic,
    currentSlideIndex,
    setCurrentView,
    resetStoredSession
  } = usePresentationStore();

  const [downloadingTopicId, setDownloadingTopicId] = React.useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = React.useState<{
    kind: 'error' | 'success';
    message: string;
  } | null>(null);

  // El modo offline real necesita service worker y Cache API; se activa en la
  // compilación de producción.
  const offlineSupported =
    Boolean(import.meta.env.PROD) && supportsOfflineCache();
  const [offlineInfo, setOfflineInfo] = React.useState<OfflineCacheInfo | null>(null);
  const [offlinePrep, setOfflinePrep] = React.useState<{
    status: 'working' | 'done' | 'error';
    done: number;
    total: number;
    message: string;
  } | null>(null);

  // HU-HOM-01: validar contra el backend que el RAG local esté activo.
  useEffect(() => {
    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 15000);
    return () => clearInterval(interval);
  }, [loadSystemHealth]);

  const ragReady = systemHealth?.status === 'healthy';
  const ragOffline = systemHealth?.status === 'offline';

  const handleDownloadMaterial = async (
    e: React.MouseEvent,
    topicId: string,
    topicTitle: string,
    tipo: 'pdf' | 'pptx' | 'md'
  ) => {
    e.stopPropagation();
    if (downloadingTopicId) return;

    const key = `${topicId}-${tipo}`;
    setDownloadingTopicId(key);
    setDownloadNotice(null);
    setRobotSpeech(
      `Preparando descarga en ${tipo.toUpperCase()} (${topicTitle})...`,
      3000
    );

    try {
      const res = await downloadTopicMaterial(topicId, tipo);
      if (res) {
        const message = `Descarga en ${tipo.toUpperCase()} iniciada: ${res.file_name}`;
        setDownloadNotice({ kind: 'success', message });
        setRobotSpeech(`¡${message}! Revisa tu navegador.`, 4000);
      } else {
        const message = `El archivo ${tipo.toUpperCase()} no está disponible para este módulo.`;
        setDownloadNotice({ kind: 'error', message });
        setRobotSpeech(message, 4000);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error de conexión al solicitar el archivo.';
      setDownloadNotice({ kind: 'error', message });
      setRobotSpeech(message, 6000);
    } finally {
      setDownloadingTopicId(null);
    }
  };

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  // Refresca el contador de módulos guardados cuando cambia la lista.
  useEffect(() => {
    if (!offlineSupported) return;

    let cancelled = false;
    getOfflineCacheInfo(topics)
      .then((info) => {
        if (!cancelled) setOfflineInfo(info);
      })
      .catch(() => {
        if (!cancelled) setOfflineInfo(null);
      });

    return () => {
      cancelled = true;
    };
  }, [topics, offlineSupported]);

  // Sesión recuperada tras recargar: el usuario puede volver a la lámina
  // donde se quedó o descartar por completo la sesión guardada.
  const handleDiscardSession = () => {
    if (
      !window.confirm(
        '¿Descartar la sesión guardada? Se eliminarán el módulo activo, el chat, la bitácora y las notas adhesivas de este navegador.'
      )
    ) {
      return;
    }
    resetStoredSession();
  };

  const handlePrepareOffline = async () => {
    if (offlinePrep?.status === 'working') return;

    if (!offlineSupported) {
      setOfflinePrep({
        status: 'error',
        done: 0,
        total: 0,
        message:
          'El modo sin conexión está disponible en la compilación de producción (npm run build && npm run preview).'
      });
      return;
    }

    if (topics.length === 0) {
      setOfflinePrep({
        status: 'error',
        done: 0,
        total: 0,
        message:
          'No hay módulos para guardar. Conéctate, sincroniza Supabase y vuelve a intentarlo.'
      });
      return;
    }

    setOfflinePrep({
      status: 'working',
      done: 0,
      total: topics.length,
      message:
        'Guardando diapositivas y notas de cada módulo. Puede tardar unos segundos.'
    });
    setRobotSpeech('Preparando los módulos para consultarlos sin conexión...', 5000);

    try {
      const result = await prepareOfflineCache(topics, {
        onProgress: (done, total) => {
          // El primer paso es el índice de módulos, no un módulo.
          const moduleDone = Math.max(0, done - 1);
          const moduleTotal = Math.max(0, total - 1);
          setOfflinePrep((previous) =>
            previous
              ? { ...previous, done: moduleDone, total: moduleTotal }
              : previous
          );
        }
      });

      const info = await getOfflineCacheInfo(topics);
      setOfflineInfo(info);

      if (result.failed.length > 0) {
        setOfflinePrep({
          status: 'error',
          done: result.cached,
          total: result.total,
          message: `Se guardaron ${result.cached} de ${result.total} módulos. ${result.failed.length} no se pudieron descargar; revisa la conexión y vuelve a intentarlo.`
        });
        setRobotSpeech(
          'Algunos módulos no se pudieron guardar para uso sin conexión.',
          5000
        );
      } else {
        setOfflinePrep({
          status: 'done',
          done: result.cached,
          total: result.total,
          message: `${result.cached} módulos listos para consultar sin conexión. El chat y las descargas siguen requiriendo internet.`
        });
        setRobotSpeech(
          `Modo sin conexión listo: ${result.cached} módulos guardados.`,
          5000
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo preparar el modo sin conexión.';
      setOfflinePrep({
        status: 'error',
        done: 0,
        total: topics.length,
        message
      });
      setRobotSpeech(message, 6000);
    }
  };

  const handleClearOffline = async () => {
    if (
      !window.confirm(
        '¿Borrar el material guardado para uso sin conexión? La sesión, el chat y las notas adhesivas se conservan.'
      )
    ) {
      return;
    }

    try {
      await clearOfflineCache();
      const info = await getOfflineCacheInfo(topics);
      setOfflineInfo(info);
      setOfflinePrep({
        status: 'done',
        done: 0,
        total: topics.length,
        message:
          'Material sin conexión borrado. Los módulos volverán a guardarse cuando los visites con conexión.'
      });
      setRobotSpeech('Material sin conexión borrado.', 3500);
    } catch (err) {
      setOfflinePrep({
        status: 'error',
        done: 0,
        total: topics.length,
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo borrar el material guardado.'
      });
    }
  };

  const savedSlideNumber =
    selectedTopic?.slides?.[currentSlideIndex]?.number ?? currentSlideIndex + 1;

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
              Plataforma Educativa con {ASSISTANT_NAME} (robot 2D) y Documento de Notas Vivas
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

          {offlineSupported && (
            <button
              onClick={handlePrepareOffline}
              disabled={offlinePrep?.status === 'working' || topics.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-850 border border-emerald-500/40 text-xs text-emerald-300 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
              title={
                offlineInfo
                  ? `${offlineInfo.cached} de ${offlineInfo.total} módulos guardados para consulta sin conexión. El chat y las descargas requieren internet.`
                  : 'Guardar todos los módulos en este navegador para consultarlos sin internet'
              }
            >
              <Download
                className={`w-3.5 h-3.5 text-emerald-400 ${
                  offlinePrep?.status === 'working' ? 'animate-bounce' : ''
                }`}
              />
              <span className="hidden sm:inline">
                {offlinePrep?.status === 'working'
                  ? `Guardando ${offlinePrep.done}/${offlinePrep.total}`
                  : `Preparar offline${
                      offlineInfo ? ` (${offlineInfo.cached}/${offlineInfo.total})` : ''
                    }`}
              </span>
            </button>
          )}

          <div
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${
              ragReady
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : ragOffline
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
            title={
              systemHealth
                ? `Módulos indexados: ${systemHealth.loadedTopics} · LLM: ${
                    systemHealth.llmConfigured ? 'conectado' : 'modo extractivo'
                  }`
                : 'Consultando el estado del backend...'
            }
          >
            <Database className="w-3.5 h-3.5" />
            <span>
              {!systemHealth
                ? 'Verificando RAG...'
                : ragReady
                  ? `RAG Vectorial Listo (${systemHealth.loadedTopics})`
                  : ragOffline
                    ? 'Backend sin conexión'
                    : 'RAG en modo degradado'}
            </span>
          </div>
          <AccessibilityControls />
        </div>
      </header>

      {/* Hero Central con el asistente y Título */}
      <main className="my-auto py-10 z-10 flex flex-col items-center max-w-5xl mx-auto w-full">
        {/* El asistente saluda */}
        <div className="mb-6 flex flex-col items-center">
          <RobotAvatar
            mood={robotMood}
            size="hero"
            speechBubble={ASSISTANT_GREETING}
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

        {/* Sesión recuperada del autoguardado local */}
        {selectedTopic && (
          <div className="mb-8 flex w-full flex-col gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                <History className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-cyan-200">
                  Reanudar sesión guardada
                </p>
                <p className="text-xs text-slate-400">
                  {selectedTopic.title} · Lámina {savedSlideNumber} de{' '}
                  {selectedTopic.slides?.length ?? selectedTopic.slides_count}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentView('presentation')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                <Play className="h-3.5 w-3.5" />
                Reanudar
              </button>
              <button
                type="button"
                onClick={handleDiscardSession}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-red-500/50 hover:text-red-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* Diagnóstico de Supabase Storage (errores reales del backend) */}
        {systemHealth?.storage &&
          (!systemHealth.storage.configured || systemHealth.storage.last_error) && (
            <div className="mb-6 flex w-full items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-200">
                  Supabase Storage{' '}
                  {systemHealth.storage.configured
                    ? 'no está respondiendo'
                    : 'no está configurado'}
                </p>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-400">
                  {systemHealth.storage.configured
                    ? systemHealth.storage.last_error
                    : 'Define SUPABASE_URL y SUPABASE_KEY en el backend para habilitar las descargas reales.'}
                </p>
              </div>
            </div>
          )}

        {/* Resultado de la última descarga solicitada */}
        {downloadNotice && (
          <div
            className={`mb-6 flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${
              downloadNotice.kind === 'error'
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-emerald-500/30 bg-emerald-500/5'
            }`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  downloadNotice.kind === 'error' ? 'text-red-400' : 'text-emerald-400'
                }`}
              />
              <p
                className={`break-words text-xs leading-relaxed ${
                  downloadNotice.kind === 'error' ? 'text-red-200' : 'text-emerald-200'
                }`}
              >
                {downloadNotice.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDownloadNotice(null)}
              className="shrink-0 rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              title="Cerrar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Estado de la preparación para uso sin conexión */}
        {offlinePrep && (
          <div
            className={`mb-6 flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${
              offlinePrep.status === 'error'
                ? 'border-amber-500/30 bg-amber-500/5'
                : offlinePrep.status === 'done'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-cyan-500/30 bg-cyan-500/5'
            }`}
          >
            <div className="flex min-w-0 items-start gap-3">
              {offlinePrep.status === 'working' ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-cyan-400" />
              ) : offlinePrep.status === 'done' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    offlinePrep.status === 'error'
                      ? 'text-amber-200'
                      : offlinePrep.status === 'done'
                        ? 'text-emerald-200'
                        : 'text-cyan-200'
                  }`}
                >
                  {offlinePrep.status === 'working'
                    ? 'Preparando modo sin conexión'
                    : offlinePrep.status === 'done'
                      ? 'Modo sin conexión disponible'
                      : 'Preparación sin conexión incompleta'}
                </p>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-400">
                  {offlinePrep.message}
                </p>
                {offlinePrep.status === 'working' && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                      style={{
                        width: `${Math.round(
                          (offlinePrep.done / Math.max(1, offlinePrep.total)) * 100
                        )}%`
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {offlinePrep.status !== 'working' &&
                offlineInfo &&
                offlineInfo.cached > 0 && (
                  <button
                    type="button"
                    onClick={handleClearOffline}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[11px] text-slate-400 transition-colors hover:border-red-500/50 hover:text-red-300"
                    title="Borrar el material guardado para consulta sin conexión"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Borrar offline</span>
                  </button>
                )}
              <button
                type="button"
                onClick={() => setOfflinePrep(null)}
                className="shrink-0 rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                title="Cerrar aviso"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

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

                {/* Botones de Descarga: solo formatos realmente disponibles (HU-HOM-02) */}
                {(() => {
                  const availableFormats = (['pdf', 'pptx', 'md'] as const).filter(
                    (tipo) => Boolean(topic.files?.[tipo])
                  );

                  if (availableFormats.length === 0) {
                    return (
                      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-500">
                        Sin archivos disponibles para descarga.
                      </div>
                    );
                  }

                  const gridClass =
                    availableFormats.length >= 3
                      ? 'grid-cols-3'
                      : availableFormats.length === 2
                        ? 'grid-cols-2'
                        : 'grid-cols-1';
                  const labels = { pdf: 'PDF', pptx: 'PPTX', md: 'MD' } as const;

                  return (
                    <div className={`mb-4 grid gap-2 ${gridClass}`}>
                      {availableFormats.map((tipo) => {
                        const key = `${topic.id}-${tipo}`;
                        const isBusy = downloadingTopicId === key;
                        const isBlocked = Boolean(downloadingTopicId);

                        return (
                          <button
                            key={tipo}
                            type="button"
                            onClick={(e) => handleDownloadMaterial(e, topic.id, topic.title, tipo)}
                            disabled={isBlocked}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-slate-950/90 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 text-xs font-semibold text-slate-300 hover:text-cyan-300 transition-all shadow-sm group/btn cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              tipo === 'md'
                                ? `Descargar notas Markdown de ${topic.title}`
                                : `Descargar presentación de ${topic.title} (${labels[tipo]})`
                            }
                          >
                            {isBusy ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                                <span>...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5 text-cyan-400 group-hover/btn:scale-110 transition-transform" />
                                <span>{labels[tipo]}</span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

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
