import React from 'react';
import { RobotMood } from '../types';
import { ASSISTANT_NAME } from '../lib/brand';

interface RobotAvatarProps {
  mood: RobotMood;
  speechBubble?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  onClick?: () => void;
}

/**
 * Etiquetas visibles del estado del asistente. Los nombres internos de los
 * estados se conservan para no romper el store ni las animaciones existentes.
 */
const MOOD_LABEL: Record<RobotMood, string> = {
  idle_atento: 'En espera',
  empujar_pantalla: 'Presentando',
  apuntar_puntero: 'Señalando',
  buscar_antena: 'Buscando',
  sin_senal: 'Sin señal',
  celebrar: 'Celebrando'
};

const BODY_PATH =
  'M100 78 C80 78 66 90 58 108 C46 132 44 156 56 169 C65 178 81 181 100 181 C119 181 135 178 144 169 C156 156 154 132 142 108 C134 90 120 78 100 78 Z';

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
    hero: 'w-52 h-52 sm:w-64 sm:h-64'
  };

  // IDs únicos: puede haber varios avatares montados a la vez.
  const uid = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const bodyGradientId = `logos-body-${uid}`;
  const headGradientId = `logos-head-${uid}`;
  const limbGradientId = `logos-limb-${uid}`;
  const bodyClipId = `logos-clip-${uid}`;

  const accent =
    mood === 'sin_senal'
      ? '#ef4444'
      : mood === 'celebrar'
        ? '#10b981'
        : mood === 'apuntar_puntero'
          ? '#f59e0b'
          : '#22d3ee';

  const bodyAnimation =
    mood === 'empujar_pantalla'
      ? 'translate-x-2 rotate-3'
      : mood === 'celebrar'
        ? 'animate-bounce'
        : 'animate-float-slow';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none ${
        onClick ? 'cursor-pointer transition-transform hover:scale-105' : ''
      } ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${ASSISTANT_NAME}, ${MOOD_LABEL[mood].toLowerCase()}`}
      title={
        onClick
          ? `${ASSISTANT_NAME} · ${MOOD_LABEL[mood]} (clic para interactuar)`
          : `${ASSISTANT_NAME} · ${MOOD_LABEL[mood]}`
      }
    >
      {/* Burbuja de diálogo contextual (Speech Bubble) */}
      {speechBubble && (
        <div className="absolute -top-14 z-30 max-w-xs px-3.5 py-1.5 bg-slate-900/95 border border-cyan-500/60 rounded-xl text-xs font-medium text-cyan-200 shadow-lg shadow-cyan-500/20 backdrop-blur-md animate-bounce">
          <div className="line-clamp-2">{speechBubble}</div>
          {/* Triangulito de la burbuja */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-b border-r border-cyan-500/60 transform rotate-45" />
        </div>
      )}

      {/* SVG del asistente: silueta blanca e inflable, ojos mínimos */}
      <div className={`relative ${sizeMap[size]} transition-all duration-300`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_10px_18px_rgba(34,211,238,0.18)] drop-shadow-[0_4px_8px_rgba(15,23,42,0.18)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`${ASSISTANT_NAME}, robot asistente`}
        >
          <defs>
            <linearGradient id={bodyGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="55%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#d7e2ee" />
            </linearGradient>
            <linearGradient id={headGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#e6edf5" />
            </linearGradient>
            <linearGradient id={limbGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e2e8f0" />
            </linearGradient>
            <clipPath id={bodyClipId}>
              <path d={BODY_PATH} />
            </clipPath>
          </defs>

          {/* Sombra proyectada en el suelo */}
          <ellipse cx="100" cy="194" rx="46" ry="6.5" fill="#020617" opacity="0.5" />
          <ellipse cx="100" cy="194" rx="34" ry="4.5" fill="#22d3ee" opacity="0.16" />

          {/* Grupo principal con animación de flotación / empuje */}
          <g className={`origin-center transition-all duration-300 ${bodyAnimation}`}>
            {/* PIERNAS CORTAS */}
            <rect
              x="78"
              y="162"
              width="20"
              height="31"
              rx="10"
              fill={`url(#${limbGradientId})`}
              stroke="#c3d0df"
              strokeWidth="1.5"
            />
            <rect
              x="102"
              y="162"
              width="20"
              height="31"
              rx="10"
              fill={`url(#${limbGradientId})`}
              stroke="#c3d0df"
              strokeWidth="1.5"
            />

            {/* CUERPO INFLABLE EN FORMA DE PERA */}
            <path
              d={BODY_PATH}
              fill={`url(#${bodyGradientId})`}
              stroke="#c3d0df"
              strokeWidth="1.8"
            />

            {/* Sombras suaves para dar volumen sin salir del cuerpo */}
            <g clipPath={`url(#${bodyClipId})`}>
              <ellipse cx="76" cy="128" rx="24" ry="34" fill="#ffffff" opacity="0.65" />
              <ellipse cx="133" cy="142" rx="22" ry="32" fill="#c3d0df" opacity="0.45" />
              <ellipse cx="100" cy="174" rx="48" ry="16" fill="#c3d0df" opacity="0.28" />
            </g>

            {/* INSIGNIA / PUERTO EN EL PECHO */}
            <circle
              cx="122"
              cy="103"
              r="7.5"
              fill="#f8fafc"
              stroke="#c8d4e2"
              strokeWidth="1.6"
            />
            {mood === 'sin_senal' ? (
              <path
                d="M119 100 L125 106 M125 100 L119 106"
                stroke="#ef4444"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ) : (
              <circle cx="122" cy="103" r="3" fill={accent} className="animate-pulse" />
            )}

            {/* CABEZA REDONDEADA */}
            <ellipse
              cx="100"
              cy="57"
              rx="31"
              ry="25"
              fill={`url(#${headGradientId})`}
              stroke="#c3d0df"
              strokeWidth="1.8"
            />

            {/* OJOS SEGÚN ESTADO ANÍMICO */}
            {(mood === 'idle_atento' || mood === 'apuntar_puntero') && (
              <g>
                <line
                  x1="91.5"
                  y1="55"
                  x2="108.5"
                  y2="55"
                  stroke="#0f172a"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <circle cx="87" cy="55" r="4.4" fill="#0f172a" />
                <circle cx="113" cy="55" r="4.4" fill="#0f172a" />
              </g>
            )}

            {mood === 'empujar_pantalla' && (
              <g stroke="#0f172a" strokeWidth="3" strokeLinecap="round">
                <path d="M82 56 Q87 51 92 56" />
                <path d="M108 56 Q113 51 118 56" />
              </g>
            )}

            {mood === 'buscar_antena' && (
              <g>
                <circle
                  cx="87"
                  cy="55"
                  r="7"
                  stroke={accent}
                  strokeWidth="2"
                  fill="none"
                  className="animate-pulse"
                />
                <circle cx="87" cy="55" r="2.5" fill={accent} />
                <circle
                  cx="113"
                  cy="55"
                  r="7"
                  stroke={accent}
                  strokeWidth="2"
                  fill="none"
                  className="animate-pulse"
                />
                <circle cx="113" cy="55" r="2.5" fill={accent} />
              </g>
            )}

            {mood === 'sin_senal' && (
              <g stroke="#ef4444" strokeWidth="2.6" strokeLinecap="round">
                <path d="M82 50 L90 58 M90 50 L82 58" />
                <path d="M110 50 L118 58 M118 50 L110 58" />
              </g>
            )}

            {mood === 'celebrar' && (
              <g stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none">
                <path d="M81 57 Q87 49 93 57" />
                <path d="M107 57 Q113 49 119 57" />
              </g>
            )}

            {/* BRAZOS SEGÚN ESTADO */}
            {mood === 'celebrar' ? (
              <g strokeLinecap="round" fill="none">
                <path d="M60 104 C46 92 42 76 46 64" stroke="#c3d0df" strokeWidth="17" />
                <path d="M60 104 C46 92 42 76 46 64" stroke="#ffffff" strokeWidth="13" />
                <circle cx="46" cy="61" r="8" fill="#ffffff" stroke="#c3d0df" strokeWidth="1.6" />
                <path d="M140 104 C154 92 158 76 154 64" stroke="#c3d0df" strokeWidth="17" />
                <path d="M140 104 C154 92 158 76 154 64" stroke="#ffffff" strokeWidth="13" />
                <circle cx="154" cy="61" r="8" fill="#ffffff" stroke="#c3d0df" strokeWidth="1.6" />
              </g>
            ) : mood === 'empujar_pantalla' ? (
              <g strokeLinecap="round" fill="none">
                {/* Brazo izquierdo en reposo */}
                <path d="M60 104 C48 116 42 134 44 148" stroke="#c3d0df" strokeWidth="17" />
                <path d="M60 104 C48 116 42 134 44 148" stroke="#ffffff" strokeWidth="13" />
                <circle cx="44" cy="150" r="8" fill="#ffffff" stroke="#c3d0df" strokeWidth="1.6" />
                {/* Brazo derecho extendido, como empujando la lámina */}
                <path d="M140 106 C154 104 168 100 180 98" stroke="#c3d0df" strokeWidth="17" />
                <path d="M140 106 C154 104 168 100 180 98" stroke="#ffffff" strokeWidth="13" />
                <circle cx="183" cy="97" r="7.5" fill="#ffffff" stroke="#c3d0df" strokeWidth="1.6" />
              </g>
            ) : mood === 'apuntar_puntero' ? (
              <g strokeLinecap="round" fill="none">
                {/* Brazo izquierdo en reposo */}
                <path d="M60 104 C48 116 42 134 44 148" stroke="#c3d0df" strokeWidth="17" />
                <path d="M60 104 C48 116 42 134 44 148" stroke="#ffffff" strokeWidth="13" />
                <circle cx="44" cy="150" r="8" fill="#ffffff" stroke="#c3d0df" strokeWidth="1.6" />
                {/* Brazo derecho señalando */}
                <path d="M140 104 C154 98 168 90 180 86" stroke="#c3d0df" strokeWidth="17" />
                <path d="M140 104 C154 98 168 90 180 86" stroke="#ffffff" strokeWidth="13" />
                <circle cx="182" cy="85" r="7.5" fill="#ffffff" stroke="#c3d0df" strokeWidth="1.6" />
                <circle cx="190" cy="82" r="4.5" fill="#f59e0b" className="animate-pulse" />
                <line
                  x1="190"
                  y1="82"
                  x2="199"
                  y2="78"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              </g>
            ) : (
              <g strokeLinecap="round" fill="none">
                <path d="M60 104 C48 116 42 134 44 148" stroke="#c3d0df" strokeWidth="17" />
                <path d="M60 104 C48 116 42 134 44 148" stroke="#ffffff" strokeWidth="13" />
                <circle cx="44" cy="150" r="8" fill="#ffffff" stroke="#c3d0df" strokeWidth="1.6" />
                <path d="M140 104 C152 116 158 134 156 148" stroke="#c3d0df" strokeWidth="17" />
                <path d="M140 104 C152 116 158 134 156 148" stroke="#ffffff" strokeWidth="13" />
                <circle cx="156" cy="150" r="8" fill="#ffffff" stroke="#c3d0df" strokeWidth="1.6" />
              </g>
            )}

            {/* Anillos de escaneo */}
            {mood === 'buscar_antena' && (
              <g fill="none" stroke={accent}>
                <circle
                  cx="100"
                  cy="57"
                  r="34"
                  strokeWidth="1.8"
                  opacity="0.55"
                  className="animate-ping"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
                <circle
                  cx="100"
                  cy="57"
                  r="45"
                  strokeWidth="1.2"
                  opacity="0.35"
                  className="animate-ping"
                  style={{
                    transformBox: 'fill-box',
                    transformOrigin: 'center',
                    animationDelay: '250ms'
                  }}
                />
              </g>
            )}

            {/* Aviso de error alrededor de la cabeza */}
            {mood === 'sin_senal' && (
              <ellipse
                cx="100"
                cy="57"
                rx="37"
                ry="31"
                fill="none"
                stroke="#ef4444"
                strokeWidth="1.6"
                opacity="0.5"
                strokeDasharray="5 4"
              />
            )}

            {/* Chispas de celebración */}
            {mood === 'celebrar' && (
              <g fill={accent}>
                <circle cx="40" cy="52" r="3" className="animate-pulse" />
                <circle
                  cx="160"
                  cy="52"
                  r="3"
                  className="animate-pulse"
                  style={{ animationDelay: '150ms' }}
                />
                <circle
                  cx="52"
                  cy="28"
                  r="2.5"
                  className="animate-pulse"
                  style={{ animationDelay: '300ms' }}
                />
                <circle
                  cx="148"
                  cy="28"
                  r="2.5"
                  className="animate-pulse"
                  style={{ animationDelay: '450ms' }}
                />
              </g>
            )}
          </g>
        </svg>
      </div>

      {/* Etiqueta de estado: nombre + ánimo actual */}
      {size !== 'sm' && (
        <span className="mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono tracking-wider uppercase bg-slate-900/80 text-cyan-400/80 border border-slate-700/50 whitespace-nowrap">
          {ASSISTANT_NAME} · {MOOD_LABEL[mood]}
        </span>
      )}
    </div>
  );
};
