import React from 'react';
import { RobotMood } from '../types';

interface RobotAvatarProps {
  mood: RobotMood;
  speechBubble?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  onClick?: () => void;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  mood,
  speechBubble,
  size = 'md',
  className = '',
  onClick
}) => {
  // Dimensiones según el tamaño solicitado
  const sizeMap = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-36 h-36',
    hero: 'w-52 h-52'
  };

  return (
    <div 
      className={`relative inline-flex flex-col items-center select-none cursor-pointer transition-transform hover:scale-105 ${className}`}
      onClick={onClick}
    >
      {/* Burbuja de diálogo contextual (Speech Bubble) */}
      {speechBubble && (
        <div className="absolute -top-14 z-30 max-w-xs px-3.5 py-1.5 bg-slate-900/95 border border-cyan-500/60 rounded-xl text-xs font-medium text-cyan-200 shadow-lg shadow-cyan-500/20 backdrop-blur-md animate-bounce">
          <div className="line-clamp-2">{speechBubble}</div>
          {/* Triangulito de la burbuja */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-cyan-500/60 transform rotate-45" />
        </div>
      )}

      {/* SVG del Robot 2D con estados dinámicos */}
      <div className={`relative ${sizeMap[size]} transition-all duration-300`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,240,255,0.25)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradientes premium */}
            <linearGradient id="robotBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="visorGlass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#020617" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="cyanNeon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="goldNeon" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
          </defs>

          {/* Sombra proyectada en el suelo */}
          <ellipse 
            cx="100" 
            cy="185" 
            rx={mood === 'empujar_pantalla' ? "55" : "45"} 
            ry="10" 
            fill="rgba(0, 240, 255, 0.15)"
            className="animate-pulse"
          />

          {/* Grupo Principal con animación de flotación / empuje */}
          <g className={`transition-all duration-300 ${
            mood === 'empujar_pantalla' ? 'translate-x-3 rotate-6' : 
            mood === 'celebrar' ? 'animate-bounce' : 
            'animate-float-slow'
          }`}>

            {/* ANTENA */}
            <line x1="100" y1="42" x2="100" y2="20" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
            
            {/* Foco de la antena */}
            <circle 
              cx="100" 
              cy="16" 
              r="8" 
              fill={
                mood === 'sin_senal' ? '#ef4444' : 
                mood === 'celebrar' ? '#10b981' : 
                '#00f0ff'
              }
              className={mood === 'buscar_antena' ? 'animate-ping' : 'animate-pulse'}
            />

            {/* Ondas electromagnéticas de búsqueda si está en 'buscar_antena' */}
            {mood === 'buscar_antena' && (
              <>
                <circle cx="100" cy="16" r="16" stroke="#00f0ff" strokeWidth="2" strokeOpacity="0.8" className="animate-ping" />
                <circle cx="100" cy="16" r="24" stroke="#00f0ff" strokeWidth="1.5" strokeOpacity="0.4" className="animate-ping" style={{ animationDelay: '200ms' }} />
              </>
            )}

            {/* OREJAS / SENSORES LATERALES */}
            <rect x="42" y="70" width="8" height="24" rx="4" fill="#475569" />
            <rect x="150" y="70" width="8" height="24" rx="4" fill="#475569" />
            <circle cx="46" cy="82" r="2.5" fill="#00f0ff" />
            <circle cx="154" cy="82" r="2.5" fill="#00f0ff" />

            {/* CABEZA */}
            <rect 
              x="50" 
              y="42" 
              width="100" 
              height="80" 
              rx="24" 
              fill="url(#robotBody)" 
              stroke="#64748b" 
              strokeWidth="3.5"
            />

            {/* VISOR FRONTAL */}
            <rect 
              x="62" 
              y="56" 
              width="76" 
              height="48" 
              rx="16" 
              fill="url(#visorGlass)" 
              stroke="#1e293b" 
              strokeWidth="2"
            />

            {/* REFLEJO DEL VISOR */}
            <path d="M 68 62 Q 95 64 125 72" stroke="rgba(255,255,255,0.15)" strokeWidth="3" strokeLinecap="round" />

            {/* OJOS SEGÚN ESTADO ANÍMICO */}
            {mood === 'idle_atento' && (
              <g className="animate-pulse">
                {/* Ojo izquierdo normal */}
                <circle cx="85" cy="80" r="8" fill="#00f0ff" />
                <circle cx="87" cy="78" r="3" fill="#ffffff" />
                {/* Ojo derecho normal */}
                <circle cx="115" cy="80" r="8" fill="#00f0ff" />
                <circle cx="117" cy="78" r="3" fill="#ffffff" />
              </g>
            )}

            {mood === 'empujar_pantalla' && (
              <g>
                {/* Ojos mirando con esfuerzo hacia el lateral */}
                <path d="M 78 78 Q 86 84 94 80" stroke="#00f0ff" strokeWidth="4" strokeLinecap="round" />
                <path d="M 108 78 Q 116 84 124 80" stroke="#00f0ff" strokeWidth="4" strokeLinecap="round" />
              </g>
            )}

            {mood === 'apuntar_puntero' && (
              <g>
                {/* Ojo enfocado apuntando hacia notas */}
                <circle cx="83" cy="80" r="7" fill="#facc15" />
                <circle cx="117" cy="80" r="9" fill="#facc15" />
                <circle cx="119" cy="78" r="3" fill="#ffffff" />
              </g>
            )}

            {mood === 'buscar_antena' && (
              <g>
                {/* Ojos como lentes binoculares escaneando */}
                <circle cx="84" cy="80" r="10" stroke="#00f0ff" strokeWidth="3" fill="none" className="animate-spin" />
                <circle cx="84" cy="80" r="4" fill="#00f0ff" />
                <circle cx="116" cy="80" r="10" stroke="#00f0ff" strokeWidth="3" fill="none" className="animate-spin" />
                <circle cx="116" cy="80" r="4" fill="#00f0ff" />
              </g>
            )}

            {mood === 'sin_senal' && (
              <g>
                {/* Ojos de cruz roja / error */}
                <path d="M 78 74 L 92 88 M 92 74 L 78 88" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M 108 74 L 122 88 M 122 74 L 108 88" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
              </g>
            )}

            {mood === 'celebrar' && (
              <g>
                {/* Ojos felices de arcoíris / estrella */}
                <path d="M 76 83 Q 85 73 94 83" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                <path d="M 106 83 Q 115 73 124 83" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
                {/* Sonrisa alegre */}
                <path d="M 94 92 Q 100 97 106 92" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
              </g>
            )}

            {/* CUELLO / CONECTOR */}
            <rect x="90" y="122" width="20" height="10" rx="3" fill="#475569" />

            {/* CUERPO / TORSO */}
            <path 
              d="M 68 132 L 132 132 L 124 175 L 76 175 Z" 
              fill="url(#robotBody)" 
              stroke="#64748b" 
              strokeWidth="3.5"
            />

            {/* PANTALLA EN EL PECHO (CORE) */}
            <rect x="85" y="142" width="30" height="22" rx="6" fill="#020617" stroke="#1e293b" strokeWidth="1.5" />
            <circle 
              cx="100" 
              cy="153" 
              r="6" 
              fill={
                mood === 'sin_senal' ? '#ef4444' :
                mood === 'celebrar' ? '#10b981' :
                mood === 'apuntar_puntero' ? '#facc15' :
                '#00f0ff'
              }
              className="animate-pulse" 
            />

            {/* BRAZOS SEGÚN ESTADO */}
            {mood === 'empujar_pantalla' ? (
              // Brazos hacia la derecha empujando
              <g>
                <path d="M 66 142 Q 80 150 95 140" stroke="#64748b" strokeWidth="5" strokeLinecap="round" fill="none" />
                <path d="M 132 142 L 170 135" stroke="#64748b" strokeWidth="6" strokeLinecap="round" fill="none" />
                <circle cx="174" cy="134" r="7" fill="#00f0ff" />
              </g>
            ) : mood === 'apuntar_puntero' ? (
              // Brazo derecho señalando con puntero láser hacia notas
              <g>
                <path d="M 68 142 Q 55 155 60 168" stroke="#64748b" strokeWidth="5" strokeLinecap="round" fill="none" />
                <path d="M 130 142 L 175 110" stroke="#64748b" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                <circle cx="178" cy="108" r="6" fill="#facc15" />
                {/* Haz láser */}
                <line x1="184" y1="104" x2="215" y2="80" stroke="#facc15" strokeWidth="2.5" strokeDasharray="3 3" className="animate-pulse" />
              </g>
            ) : mood === 'celebrar' ? (
              // Brazos levantados en victoria
              <g>
                <path d="M 68 142 Q 45 125 50 100" stroke="#64748b" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                <circle cx="50" cy="98" r="6" fill="#10b981" />
                <path d="M 132 142 Q 155 125 150 100" stroke="#64748b" strokeWidth="5.5" strokeLinecap="round" fill="none" />
                <circle cx="150" cy="98" r="6" fill="#10b981" />
              </g>
            ) : (
              // Brazos reposo normal
              <g>
                <path d="M 68 142 Q 52 155 58 168" stroke="#64748b" strokeWidth="5" strokeLinecap="round" fill="none" />
                <circle cx="58" cy="170" r="5" fill="#475569" />
                <path d="M 132 142 Q 148 155 142 168" stroke="#64748b" strokeWidth="5" strokeLinecap="round" fill="none" />
                <circle cx="142" cy="170" r="5" fill="#475569" />
              </g>
            )}

          </g>
        </svg>
      </div>

      {/* Etiqueta de estado sutil en modo pequeño */}
      <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase bg-slate-900/80 text-cyan-400/80 border border-slate-700/50">
        {mood.replace('_', ' ')}
      </span>
    </div>
  );
};
