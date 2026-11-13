import React from 'react';
import {
  X,
  History,
  Sparkles,
  Globe,
  Download,
  Clock,
  FileJson,
  Trash2,
  Save,
  Upload,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import {
  buildSessionBackup,
  buildSessionLogMarkdown,
  downloadText,
  fileStamp,
  slugify
} from '../lib/sessionExport';
import { MAX_BACKUP_BYTES, parseSessionBackup } from '../lib/sessionImport';
import type {
  BackupPreview,
  ImportMode,
  SessionBackup
} from '../lib/sessionImport';

export const SessionLogDrawer: React.FC = () => {
  const {
    isSessionLogOpen,
    toggleSessionLog,
    sessionHistory,
    selectedTopic,
    chatMessages,
    stickyNotes,
    contrastMode,
    fontSize,
    resetStoredSession,
    importSessionBackup
  } = usePresentationStore();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = React.useState<{
    backup: SessionBackup;
    preview: BackupPreview;
    fileName: string;
  } | null>(null);
  const [importMode, setImportMode] = React.useState<ImportMode>('merge');
  const [importError, setImportError] = React.useState<string | null>(null);
  const [isReadingBackup, setIsReadingBackup] = React.useState(false);

  // Al cerrar la bitácora se descarta cualquier vista previa pendiente para que
  // el próximo respaldo se seleccione desde cero.
  React.useEffect(() => {
    if (!isSessionLogOpen) {
      setPendingImport(null);
      setImportError(null);
      setIsReadingBackup(false);
    }
  }, [isSessionLogOpen]);

  if (!isSessionLogOpen) return null;

  const sourceLabel = (source: string) =>
    source === 'local'
      ? 'Notas Oficiales'
      : source === 'timeout'
        ? 'Sin conexión'
        : 'Búsqueda Web Externa';

  const exportBaseName = `${slugify(selectedTopic?.title ?? 'sesion')}-${fileStamp()}`;

  const exportMarkdown = () => {
    downloadText(
      `bitacora-${exportBaseName}.md`,
      buildSessionLogMarkdown(sessionHistory, selectedTopic?.title)
    );
  };

  const exportBackup = () => {
    downloadText(
      `sesion-${exportBaseName}.json`,
      buildSessionBackup({
        topic: selectedTopic,
        chatMessages,
        sessionHistory,
        stickyNotes,
        contrastMode,
        fontSize
      }),
      'application/json;charset=utf-8'
    );
  };

  const resetImportPanel = () => {
    setPendingImport(null);
    setImportError(null);
    setIsReadingBackup(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPendingImport(null);
    setImportError(null);

    if (file.size > MAX_BACKUP_BYTES) {
      setImportError(
        'El archivo supera el límite de 5 MB. Selecciona un respaldo más pequeño.'
      );
      return;
    }

    setIsReadingBackup(true);
    try {
      const text = await file.text();
      const result = parseSessionBackup(text);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      setImportMode('merge');
      setPendingImport({
        backup: result.backup,
        preview: result.preview,
        fileName: file.name
      });
    } catch {
      setImportError(
        'No se pudo leer el archivo. Revisa que sea un JSON accesible y vuelve a intentarlo.'
      );
    } finally {
      setIsReadingBackup(false);
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;

    const hasCurrentSession =
      sessionHistory.length > 0 ||
      chatMessages.length > 0 ||
      stickyNotes.length > 0 ||
      Boolean(selectedTopic);

    if (
      importMode === 'replace' &&
      hasCurrentSession &&
      !window.confirm(
        '¿Reemplazar la sesión actual con el respaldo? Se sustituirán el módulo, el chat, la bitácora y las notas adhesivas de este navegador. Descarga un respaldo antes si lo necesitas.'
      )
    ) {
      return;
    }

    importSessionBackup(pendingImport.backup, importMode);
    resetImportPanel();
  };

  const formatBackupDate = (value: string) => {
    if (!value) return 'sin fecha';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const handleReset = () => {
    if (
      !window.confirm(
        '¿Borrar la sesión guardada en este navegador? Se eliminarán el chat, la bitácora, las notas adhesivas y el módulo activo. Descarga un respaldo antes si lo necesitas.'
      )
    ) {
      return;
    }
    resetStoredSession();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm"
      onClick={toggleSessionLog}
    >
      <div 
        className="w-full max-w-md h-full bg-slate-900 border-l border-slate-700/80 p-5 shadow-2xl flex flex-col text-slate-100 animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Bitácora de Dudas de la Sesión</h2>
              <p className="text-xs text-slate-400">{sessionHistory.length} consultas registradas</p>
            </div>
          </div>

          <button
            onClick={toggleSessionLog}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Acciones de exportación y respaldo */}
        <div className="py-3 border-b border-slate-800 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={exportMarkdown}
            disabled={sessionHistory.length === 0}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium border border-slate-700 hover:border-cyan-500/50 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Descargar la bitácora de dudas en Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Bitácora .md</span>
          </button>
          <button
            onClick={exportBackup}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-slate-700 hover:border-emerald-500/50 transition-all flex items-center gap-1.5"
            title="Descargar chat, bitácora, notas adhesivas y módulo en JSON"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Respaldo .json</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadingBackup}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-500/20 text-sky-300 text-xs font-medium border border-slate-700 hover:border-sky-500/50 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Restaurar o fusionar un respaldo JSON exportado por la plataforma"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isReadingBackup ? 'Leyendo…' : 'Importar .json'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        {/* Importación de respaldos: vista previa antes de tocar la sesión */}
        {(importError || pendingImport) && (
          <div className="py-3 border-b border-slate-800 space-y-3">
            {importError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <div className="space-y-2">
                  <p className="leading-relaxed">{importError}</p>
                  <button
                    type="button"
                    onClick={resetImportPanel}
                    className="text-[11px] font-semibold text-red-300 underline underline-offset-2 hover:text-red-200"
                  >
                    Cerrar aviso
                  </button>
                </div>
              </div>
            )}

            {pendingImport && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 space-y-3 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-sky-400" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100">
                      Respaldo listo para importar
                    </p>
                    <p className="truncate text-[11px] text-slate-400" title={pendingImport.fileName}>
                      {pendingImport.fileName}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1.5">
                  <p className="font-semibold text-slate-200">
                    {pendingImport.preview.topicTitle}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {pendingImport.preview.topicId
                      ? `${pendingImport.preview.slides} láminas · `
                      : ''}
                    Exportado: {formatBackupDate(pendingImport.preview.exportedAt)}
                  </p>
                  <ul className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <li className="rounded-lg bg-slate-800/80 p-2">
                      <span className="block text-sm font-bold text-cyan-300">
                        {pendingImport.preview.chatMessages}
                      </span>
                      <span className="text-[10px] text-slate-400">Mensajes</span>
                    </li>
                    <li className="rounded-lg bg-slate-800/80 p-2">
                      <span className="block text-sm font-bold text-emerald-300">
                        {pendingImport.preview.sessionHistory}
                      </span>
                      <span className="text-[10px] text-slate-400">Consultas</span>
                    </li>
                    <li className="rounded-lg bg-slate-800/80 p-2">
                      <span className="block text-sm font-bold text-amber-300">
                        {pendingImport.preview.stickyNotes}
                      </span>
                      <span className="text-[10px] text-slate-400">Notas</span>
                    </li>
                  </ul>
                </div>

                {pendingImport.preview.warnings.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1">
                    {pendingImport.preview.warnings.map((warning, index) => (
                      <p
                        key={`${index}-${warning}`}
                        className="flex items-start gap-1.5 text-[11px] text-amber-200"
                      >
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{warning}</span>
                      </p>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Cómo importar
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        importMode === 'merge'
                          ? 'border-sky-500/60 bg-sky-500/15 text-sky-100'
                          : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span className="block text-[11px] font-semibold">Fusionar</span>
                      <span className="block text-[10px] text-slate-400">
                        Conserva lo actual y añade el respaldo
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('replace')}
                      className={`rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        importMode === 'replace'
                          ? 'border-amber-500/60 bg-amber-500/15 text-amber-100'
                          : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <span className="block text-[11px] font-semibold">Reemplazar</span>
                      <span className="block text-[10px] text-slate-400">
                        Sustituye la sesión actual
                      </span>
                    </button>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500">
                    Los datos se validan y recortan a los límites de autoguardado
                    antes de aplicarse. No se envía nada al servidor.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetImportPanel}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmImport}
                    className="px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-200 text-xs font-semibold border border-sky-500/50 hover:bg-sky-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {importMode === 'replace' ? 'Reemplazar sesión' : 'Fusionar respaldo'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lista de Registros */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5">
          {sessionHistory.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">Aún no hay dudas formuladas</p>
              <p>Presiona <kbd className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-cyan-400">Q</kbd> durante la presentación para consultar.</p>
            </div>
          ) : (
            sessionHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-850/80 border border-slate-700/70 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                    item.source === 'local'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : item.source === 'timeout'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {item.source === 'local' ? <Sparkles className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                    {sourceLabel(item.source)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.latency_ms}ms • Conf. {Math.round(item.confidence * 100)}%
                  </span>
                </div>

                <p className="font-semibold text-slate-200">
                  "{item.query}"
                </p>

                <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  {item.answer_summary}
                </p>

                {item.external_url && (
                  <a
                    href={item.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-cyan-400 hover:underline block truncate"
                  >
                    🔗 {item.external_url}
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        {/* Pie: autoguardado y borrado de la sesión local */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5" title="La sesión se guarda en este navegador; no se envía a ningún servidor.">
            <Save className="h-3.5 w-3.5 text-emerald-400" />
            Autoguardado en este navegador
          </span>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-slate-400 transition-colors hover:border-red-500/50 hover:text-red-300"
            title="Borrar chat, bitácora, notas adhesivas y módulo guardados"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Borrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};
