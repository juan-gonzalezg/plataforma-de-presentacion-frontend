import React, { useState, useEffect } from 'react';
import {
  Eye,
  Sun,
  Moon,
  Monitor,
  Type,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  History,
  Brain,
  Globe,
  Loader2
} from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { ContrastMode, FontSizeSetting } from '../types';

export const AccessibilityControls: React.FC = () => {
  const {
    contrastMode,
    setContrastMode,
    fontSize,
    setFontSize,
    toggleSessionLog,
    sessionHistory,
    systemHealth,
    isCheckingHealth,
    loadSystemHealth
  } = usePresentationStore();

  const [isOpen, setIsOpen] = useState(false);

  // HU-HOM-01: validación real del backend y de la base vectorial local.
  useEffect(() => {
    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 15000);
    return () => clearInterval(interval);
  }, [loadSystemHealth]);

  const isHealthy = systemHealth?.status === 'healthy';
  const isOffline = systemHealth?.status === 'offline';
  const statusDot = isHealthy
    ? 'bg-emerald-400'
    : isOffline
      ? 'bg-red-400'
      : 'bg-amber-400';

  // Atajo directo: alterna entre los dos modos relajantes. Si el usuario está
  // en Alto Contraste (tema oscuro), el primer clic lo lleva al modo claro.
  const isLightMode = contrastMode === 'clean-light';
  const themeToggleLabel = isLightMode
    ? 'Cambiar a modo oscuro'
    : 'Cambiar a modo claro';
  const toggleTheme = () => {
    setContrastMode(isLightMode ? 'cinema-dark' : 'clean-light');
  };

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="soft-control flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-300"
        title="Opciones de proyección y accesibilidad"
      >
        <Eye className="w-4 h-4 text-cyan-400" />
        <span className="hidden md:inline">Proyección & Legibilidad</span>
        <span className={`w-2 h-2 rounded-full ml-1 ${statusDot}`} />
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        title={themeToggleLabel}
        aria-label={themeToggleLabel}
        aria-pressed={isLightMode}
        className="soft-control flex items-center justify-center p-2 rounded-lg text-slate-300"
      >
        {isLightMode ? (
          <Moon className="w-4 h-4 text-[#778d7a]" />
        ) : (
          <Sun className="w-4 h-4 text-[#c9b899]" />
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-72 p-4 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl z-50 text-slate-200 text-xs space-y-4 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-slate-100 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-cyan-400" /> Proyección & Legibilidad
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Selector de Contraste */}
          <div>
            <label className="block text-slate-400 mb-2 font-medium">Contraste de Pantalla</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setContrastMode('cinema-dark')}
                className={`p-2 rounded-lg border text-center transition-all ${
                  contrastMode === 'cinema-dark'
                    ? 'bg-[#778d7a]/20 border-[#778d7a] text-slate-100 font-bold'
                    : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5 mx-auto mb-1 text-[#778d7a]" />
                <span>Oscuro relajante</span>
              </button>

              <button
                onClick={() => setContrastMode('projector-high-contrast')}
                className={`p-2 rounded-lg border text-center transition-all ${
                  contrastMode === 'projector-high-contrast'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                    : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Monitor className="w-3.5 h-3.5 mx-auto mb-1 text-amber-400" />
                <span>Alto Contraste</span>
              </button>

              <button
                onClick={() => setContrastMode('clean-light')}
                className={`p-2 rounded-lg border text-center transition-all ${
                  contrastMode === 'clean-light'
                    ? 'bg-[#778d7a]/20 border-[#778d7a] text-slate-100 font-bold'
                    : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Sun className="w-3.5 h-3.5 mx-auto mb-1 text-[#c9b899]" />
                <span>Claro relajante</span>
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-slate-400">
              El verde salvia marca el foco y la acción principal; el azul acero y la arena son de apoyo.
            </p>
          </div>

          {/* Selector de Tamaño de Fuente */}
          <div>
            <label className="block text-slate-400 mb-2 font-medium flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-cyan-400" /> Tamaño de Fuente Base
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['normal', 'large', 'xlarge'] as FontSizeSetting[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setFontSize(size)}
                  className={`py-1.5 px-2 rounded-lg border text-center capitalize transition-all ${
                    fontSize === size
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {size === 'normal' ? '18px (Estándar)' : size === 'large' ? '21px (Grande)' : '25px (Auditorio)'}
                </button>
              ))}
            </div>
          </div>

          {/* Estado real del sistema (HU-HOM-01) */}
          <div className="pt-2 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-cyan-400" /> RAG Local Vectorial:
              </span>
              {isCheckingHealth && !systemHealth ? (
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando...
                </span>
              ) : systemHealth?.vectorDbActive ? (
                <span className="font-semibold text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Activo ({systemHealth.loadedTopics})
                </span>
              ) : (
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> No disponible
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-purple-400" /> Generación LLM:
              </span>
              <span
                className={`font-semibold ${
                  systemHealth?.llmConfigured ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {systemHealth?.llmConfigured ? 'Conectado' : 'Modo extractivo'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" /> Búsqueda web:
              </span>
              <span
                className={`font-semibold ${
                  systemHealth?.webConfigured ? 'text-emerald-300' : 'text-slate-400'
                }`}
              >
                {systemHealth?.webConfigured
                  ? systemHealth.webProvider ?? 'Activa'
                  : 'Desactivada'}
              </span>
            </div>
          </div>

          {/* Acceso a Bitácora */}
          <button
            onClick={() => {
              setIsOpen(false);
              toggleSessionLog();
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium border border-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <History className="w-4 h-4" />
            <span>Ver Bitácora de Dudas ({sessionHistory.length})</span>
          </button>
        </div>
      )}
    </div>
  );
};
