import React from 'react';
import { X, History, Sparkles, Globe, Download, Clock } from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';

export const SessionLogDrawer: React.FC = () => {
  const { isSessionLogOpen, toggleSessionLog, sessionHistory } = usePresentationStore();

  if (!isSessionLogOpen) return null;

  const sourceLabel = (source: string) =>
    source === 'local'
      ? 'Notas Oficiales'
      : source === 'timeout'
        ? 'Sin conexión'
        : 'Búsqueda Web Externa';

  const exportMarkdown = () => {
    const lines = [
      `# Bitácora de Dudas y Respuestas de la Sesión`,
      `Fecha: ${new Date().toLocaleDateString()} - Total de consultas: ${sessionHistory.length}\n`,
      ...sessionHistory.map((item, index) => {
        const webLines = (item.web_results ?? [])
          .map((r) => `  - [${r.id}] ${r.title}: ${r.url}`)
          .join('\n');
        return `### ${index + 1}. Pregunta: "${item.query}"\n` +
          `- **Fuente:** ${sourceLabel(item.source)}\n` +
          (item.provider ? `- **Proveedor web:** ${item.provider}\n` : '') +
          `- **Confianza:** ${Math.round(item.confidence * 100)}% | **Latencia:** ${item.latency_ms}ms\n` +
          `- **Respuesta:** ${item.answer_summary}\n` +
          (item.external_url ? `- **URL Externa:** ${item.external_url}\n` : '') +
          (webLines ? `- **Fuentes web:**\n${webLines}\n` : '') +
          `\n---`;
      })
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bitacora-sesion-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
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

        {/* Acciones de exportación */}
        {sessionHistory.length > 0 && (
          <div className="py-3 border-b border-slate-800 flex justify-end">
            <button
              onClick={exportMarkdown}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 text-xs font-medium border border-slate-700 hover:border-cyan-500/50 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Resumen en Markdown</span>
            </button>
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
      </div>
    </div>
  );
};
