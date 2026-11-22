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
  Database,
  Download,
  Loader2,
  BookOpen,
  RefreshCw,
  History,
  RotateCcw,
  AlertTriangle,
  X,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { RobotAvatar } from './RobotAvatar';
import { AccessibilityControls } from './AccessibilityControls';
import { SpotlightTour, TourStep } from './SpotlightTour';
import { hasSeenGuide, markGuideSeen } from '../lib/guideSeen';
import {
  clearOfflineCache,
  getOfflineCacheInfo,
  prepareOfflineCache,
  supportsOfflineCache
} from '../lib/offlineCache';
import type { OfflineCacheInfo } from '../lib/offlineCache';
import { ASSISTANT_GREETING, ASSISTANT_NAME } from '../lib/brand';

const HOME_GUIDE_STEPS: TourStep[] = [
  {
    selector: '[data-tour="home-modules"]',
    title: 'Tarjetas de módulos',
    description:
      'Cada tarjeta te deja entrar a Estudiar (IA) o a Presentación. También puedes descargar el PDF del módulo si lo necesitas.'
  },
  {
    selector: '[data-tour="home-status"]',
    title: 'Estado y sincronización',
    description:
      'Aquí actualizas los materiales y revisas si están disponibles, sin interrumpir la elección del módulo.'
  }
];

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
    lastActiveView,
    resetStoredSession
  } = usePresentationStore();

  const [downloadingTopicId, setDownloadingTopicId] = React.useState<string | null>(null);
  const [downloadNotice, setDownloadNotice] = React.useState<{
    kind: 'error' | 'success';
    message: string;
  } | null>(null);

  // Sincronización y fallback local: aviso corto, sin romper la grilla.
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncNotice, setSyncNotice] = React.useState<{
    kind: 'error' | 'success';
    message: string;
  } | null>(null);
  const [localNoticeDismissed, setLocalNoticeDismissed] = React.useState(false);

  // Mini-guía del Home: aparece una sola vez y se puede reabrir desde "? Guía".
  const [isGuideOpen, setIsGuideOpen] = React.useState(false);

  const closeGuide = React.useCallback(() => {
    setIsGuideOpen(false);
    markGuideSeen('home');
  }, []);

  useEffect(() => {
    if (hasSeenGuide('home')) return;
    const timer = window.setTimeout(() => {
      if (!hasSeenGuide('home')) setIsGuideOpen(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, []);

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
  const storageInfo = systemHealth?.storage;
  const storageProblem = Boolean(
    storageInfo && (!storageInfo.configured || Boolean(storageInfo.last_error))
  );
  const materialLabels = { pdf: 'PDF', pptx: 'PPTX', md: 'MD' } as const;

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

  // Sincronizar descubre módulos del bucket. Si falla, conservamos la grilla
  // con los módulos disponibles localmente y mostramos un aviso amigable.
  const handleSync = async () => {
    if (isSyncing || isLoadingTopics) return;
    setIsSyncing(true);
    setSyncNotice(null);
    setLocalNoticeDismissed(false);

    try {
      const result = await refreshTopics();
      await loadSystemHealth();
      const currentStorage = usePresentationStore.getState().systemHealth?.storage;
      const currentStorageProblem = Boolean(
        currentStorage && (!currentStorage.configured || Boolean(currentStorage.last_error))
      );

      if (!result.ok || currentStorageProblem) {
        setSyncNotice({
          kind: 'error',
          message: 'No pudimos sincronizar con Supabase. Se muestran los módulos disponibles en este navegador.'
        });
      } else {
        setSyncNotice({ kind: 'success', message: result.message });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEnterTopic = async (
    topicId: string,
    view: 'presentation' | 'notebooklm'
  ) => {
    if (isLoadingTopicDetail) return;
    setSyncNotice(null);
    await selectTopic(topicId, view);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden">
      {/* Luces de fondo decorativas */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col p-4 sm:p-6 lg:p-8">
        {/* A. Barra superior / cabecera de estado */}
        <header className="flex flex-col gap-4 border-b border-slate-800/80 pb-5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight text-slate-100 uppercase sm:text-xl">
                Presentaciones Interactivas con Asistente IA
              </h1>
              <p className="text-[11px] text-slate-400 sm:text-xs">
                Plataforma Educativa con {ASSISTANT_NAME} y Documento de Notas Vivas
              </p>
            </div>
          </div>

          <div
            data-tour="home-status"
            className="flex flex-wrap items-center gap-1.5 lg:flex-nowrap lg:justify-end"
          >
            <button
              onClick={handleSync}
              disabled={isSyncing || isLoadingTopics}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-cyan-500/40 bg-slate-900/80 px-3 py-1.5 text-xs text-cyan-300 transition-all hover:scale-[1.02] hover:bg-slate-850 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              title="Descubrir o refrescar los módulos del bucket de Supabase Storage"
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            <button
              onClick={handlePrepareOffline}
              disabled={offlinePrep?.status === 'working' || topics.length === 0}
              className="flex items-center gap-2 whitespace-nowrap rounded-full border border-emerald-500/40 bg-slate-900/80 px-3 py-1.5 text-xs text-emerald-300 transition-all hover:scale-[1.02] hover:bg-slate-850 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              title={
                !offlineSupported
                  ? 'El modo sin conexión se activa en la compilación de producción (npm run build && npm run preview).'
                  : offlineInfo
                    ? `${offlineInfo.cached} de ${offlineInfo.total} módulos guardados para consulta sin conexión. El chat y las descargas requieren internet.`
                    : 'Guardar todos los módulos en este navegador para consultarlos sin internet'
              }
            >
              <Download
                className={`h-3.5 w-3.5 text-emerald-400 ${
                  offlinePrep?.status === 'working' ? 'animate-bounce' : ''
                }`}
              />
              <span>
                {offlinePrep?.status === 'working'
                  ? `Guardando ${offlinePrep.done}/${offlinePrep.total}`
                  : `Preparar offline${
                      offlineInfo ? ` (${offlineInfo.cached}/${offlineInfo.total})` : ''
                    }`}
              </span>
            </button>

            {/* Indicador de estado: se lee como estado, no como acción. */}
            <div
              className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs ${
                ragReady
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : ragOffline
                    ? 'border-red-500/30 bg-red-500/10 text-red-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
              title={
                systemHealth
                  ? `Módulos indexados: ${systemHealth.loadedTopics} · LLM: ${
                      systemHealth.llmConfigured ? 'conectado' : 'modo extractivo'
                    }`
                  : 'Consultando el estado del backend...'
              }
            >
              <Database className="h-3.5 w-3.5" />
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
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
              title="Guía rápida del inicio"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Guía
            </button>
          </div>
        </header>

      {/* B. Zona de bienvenida con Logos */}
      <main className="flex flex-1 flex-col items-center py-8 sm:py-10">
        {/* El asistente saluda */}
        <div className="mb-6 flex flex-col items-center">
          {/* Claymorphism solo aquí: insignia de bienvenida, nunca en celdas. */}
          <div className="clay-badge rounded-[2.5rem] px-5 py-4 sm:px-8 sm:py-5">
            <RobotAvatar
              mood={robotMood}
              size="hero"
              speechBubble={ASSISTANT_GREETING}
              onClick={() => setRobotMood('celebrar', 1500)}
            />
          </div>
        </div>

        <div className="text-center mb-10 space-y-2">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
            Selecciona el Módulo Educativo de la Sesión
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-slate-400 sm:text-base">
            Cada módulo incluye diapositivas, notas, documento y asistente de estudio.
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
                onClick={() => setCurrentView(lastActiveView)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                {lastActiveView === 'notebooklm' ? (
                  <BookOpen className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {lastActiveView === 'notebooklm' ? 'Reanudar estudio' : 'Reanudar presentación'}
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

        {/* Aviso amigable de sincronización / modo local (sin romper la grilla) */}
        {(syncNotice || (storageProblem && !localNoticeDismissed)) && (
          <div
            title={
              storageInfo?.last_error ??
              (!storageInfo?.configured
                ? 'Define SUPABASE_URL y SUPABASE_KEY en el backend para habilitar la sincronización.'
                : undefined)
            }
            className={`mb-6 flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${
              syncNotice?.kind === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
            }`}
          >
            <div className="flex min-w-0 items-start gap-3">
              {syncNotice?.kind === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              )}
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    syncNotice?.kind === 'success' ? 'text-emerald-200' : 'text-amber-200'
                  }`}
                >
                  {syncNotice?.kind === 'success'
                    ? 'Sincronización completada'
                    : 'Trabajando en modo local'}
                </p>
                <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-400">
                  {syncNotice?.message ??
                    'No pudimos conectar con Supabase. Se muestran los módulos disponibles en este navegador.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSyncNotice(null);
                setLocalNoticeDismissed(true);
              }}
              className="shrink-0 rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              title="Cerrar aviso"
            >
              <X className="h-3.5 w-3.5" />
            </button>
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

        {/* C. Grilla de tarjetas de módulos (HU-HOM-01) */}
        {isLoadingTopics ? (
          <div
            data-tour="home-modules"
            className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50" />
            ))}
          </div>
        ) : (
          <div
            data-tour="home-modules"
            className="grid w-full grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {topics.map((topic) => {
              const availableFormats = (['pdf', 'pptx', 'md'] as const).filter(
                (tipo) => Boolean(topic.files?.[tipo])
              );

              return (
                <article
                  key={topic.id}
                  className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-2xl hover:shadow-cyan-500/10"
                >
                  {/* Cabecera: icono a la izquierda, categoría a la derecha */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 transition-transform group-hover:scale-105">
                      {getTopicIcon(topic.icon)}
                    </div>
                    <span className="rounded-full border border-cyan-800/40 bg-cyan-950/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                      {topic.category.split('&')[0].trim()}
                    </span>
                  </div>

                  {/* Cuerpo: título, resumen corto y etiquetas compactas */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-100 transition-colors group-hover:text-cyan-300">
                      {topic.title}
                    </h3>
                    <p
                      className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400"
                      title={topic.summary}
                    >
                      {topic.summary}
                    </p>
                    <div className="mt-3 flex flex-nowrap gap-1.5 overflow-hidden">
                      {topic.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="shrink-0 whitespace-nowrap rounded-md border border-slate-800 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metadatos + descarga discreta (HU-HOM-02) */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-slate-500" />
                        {topic.slides_count} láminas
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        {topic.estimated_minutes} min
                      </span>
                    </div>
                    <div className="flex min-w-0 items-center justify-end gap-1.5">
                      {availableFormats.map((tipo) => {
                        const key = `${topic.id}-${tipo}`;
                        const isBusy = downloadingTopicId === key;

                        return (
                          <button
                            key={tipo}
                            type="button"
                            onClick={(e) => handleDownloadMaterial(e, topic.id, topic.title, tipo)}
                            disabled={Boolean(downloadingTopicId)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              tipo === 'md'
                                ? `Descargar notas Markdown de ${topic.title}`
                                : `Descargar ${materialLabels[tipo]} de ${topic.title}`
                            }
                          >
                            {isBusy ? (
                              <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                            ) : tipo === 'pdf' ? (
                              <Download className="h-3 w-3 text-cyan-400" />
                            ) : null}
                            <span>{materialLabels[tipo]}</span>
                          </button>
                        );
                      })}
                      {availableFormats.length === 0 && (
                        <span className="text-slate-600">Sin material</span>
                      )}
                    </div>
                  </div>

                  {/* Doble acción de entrada: estudio con IA o presentación */}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => handleEnterTopic(topic.id, 'notebooklm')}
                      disabled={isLoadingTopicDetail}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-3 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Estudiar (IA)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEnterTopic(topic.id, 'presentation')}
                      disabled={isLoadingTopicDetail}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-xs font-semibold text-slate-100 transition-colors hover:border-[#778d7a] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Presentación
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

        {/* Footer con atajos de ayuda */}
        <footer className="mt-auto flex flex-col items-center justify-between gap-2 border-t border-slate-800/80 pt-4 text-xs text-slate-500 sm:flex-row">
          <p>
            Control de la sesión optimizado para proyector y atajos de teclado rápidos (<kbd className="font-mono text-slate-400">Flechas</kbd>, <kbd className="font-mono text-slate-400">N</kbd>, <kbd className="font-mono text-slate-400">Q</kbd>, <kbd className="font-mono text-slate-400">Esc</kbd>).
          </p>
          <span className="font-mono text-slate-400">v1.0.0 • React + FastAPI RAG</span>
        </footer>

        <SpotlightTour
          steps={HOME_GUIDE_STEPS}
          open={isGuideOpen}
          onClose={closeGuide}
        />
      </div>
    </div>
  );
};
