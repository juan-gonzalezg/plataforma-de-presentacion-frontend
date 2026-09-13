import React, { useState, useEffect } from 'react';
import { Eye, Sun, Moon, Monitor, Type, Wifi, CheckCircle2, History } from 'lucide-react';
import { usePresentationStore } from '../store/usePresentationStore';
import { ContrastMode, FontSizeSetting } from '../types';
import { apiUrl } from '../lib/apiBase';

export const AccessibilityControls: React.FC = () => {
  const { 
    contrastMode, 
    setContrastMode, 
    fontSize, 
    setFontSize,
    toggleSessionLog,
    sessionHistory
  } = usePresentationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);

  // Comprobar salud periódica del RAG local
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(apiUrl('/api/health'));
        setIsBackendHealthy(res.ok);
      } catch {
        setIsBackendHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs text-slate-300 transition-colors"
        title="Opciones de proyección y accesibilidad"
      >
        <Eye className="w-4 h-4 text-cyan-400" />
        <span className="hidden md:inline">Proyección & Legibilidad</span>
        <span className={`w-2 h-2 rounded-full ml-1 ${isBackendHealthy ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 top-full mt-2 w-72 p-4 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl z-50 text-slate-200 text-xs space-y-4 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-semibold text-slate-100 flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-cyan-400" /> Modo Proyector (WCAG AA)
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
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold' 
                    : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
                <span>Cinema Dark</span>
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
                    ? 'bg-blue-500/20 border-blue-400 text-blue-200 font-bold' 
                    : 'bg-slate-800/60 border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Sun className="w-3.5 h-3.5 mx-auto mb-1 text-amber-300" />
                <span>Luz Natural</span>
              </button>
            </div>
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

          {/* Estado de Salud RAG */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" /> RAG Local Vectorial:
            </span>
            <span className="font-semibold text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Activo (Disco)
            </span>
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
