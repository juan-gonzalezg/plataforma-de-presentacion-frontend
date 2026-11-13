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
  'M100 80 C84 80 72 87 64 99 C55 112 50 126 49 140 C47 158 59 173 77 178 C91 182 109 182 123 178 C141 173 153 158 151 140 C150 126 145 112 136 99 C128 87 116 80 100 80 Z';

/** Cápsulas de brazos: mismo trazo redondeado en todos los estados. */
const LEFT_ARM_IDLE = 'M57 108 C45 120 39 140 43 154';
const RIGHT_ARM_IDLE = 'M143 108 C155 120 161 140 157 154';

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
  const podGradientId = `logos-pod-${uid}`;
  const bodyClipId = `logos-clip-${uid}`;
  const headClipId = `logos-head-clip-${uid}`;
  const softShadowId = `logos-shadow-${uid}`;

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

  const armProps = {
    fill: 'none',
    stroke: `url(#${limbGradientId})`,
    strokeWidth: 19,
    strokeLinecap: 'round' as const,
    filter: `url(#${softShadowId})`
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

      {/* SVG del asistente: blanco, inflable y con articulaciones suaves */}
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
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="40%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>
            <linearGradient id={headGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#f8fbff" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id={limbGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e0f2fe" />
            </linearGradient>
            <linearGradient id={podGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="55%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <clipPath id={bodyClipId}>
              <path d={BODY_PATH} />
            </clipPath>
            <clipPath id={headClipId}>
              <ellipse cx="100" cy="56" rx="33" ry="26" />
            </clipPath>
            <filter
              id={softShadowId}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="1.5"
                stdDeviation="1.3"
                floodColor="#334155"
                floodOpacity="0.45"
              />
            </filter>
          </defs>

          {/* Sombra proyectada en el suelo */}
          <ellipse cx="100" cy="194" rx="46" ry="6.5" fill="#020617" opacity="0.5" />
          <ellipse cx="100" cy="194" rx="34" ry="4.5" fill="#22d3ee" opacity="0.16" />

          {/* Grupo principal con animación de flotación / empuje */}
          <g className={`origin-center transition-all duration-300 ${bodyAnimation}`}>
            {/* BRAZOS DETRÁS DEL CUERPO: cápsulas sin costuras duras */}
            {mood === 'celebrar' ? (
              <g {...armProps}>
                <path d="M57 108 C45 94 41 78 45 64" />
                <circle cx="45" cy="61" r="9.5" fill="#f8fbff" />
                <path d="M143 108 C155 94 159 78 155 64" />
                <circle cx="155" cy="61" r="9.5" fill="#f8fbff" />
              </g>
            ) : mood === 'empujar_pantalla' ? (
              <g {...armProps}>
                <path d={LEFT_ARM_IDLE} />
                <circle cx="43" cy="156" r="9.5" fill="#f8fbff" />
                <path d="M143 108 C157 106 171 102 183 99" />
                <circle cx="186" cy="98" r="9.5" fill="#f8fbff" />
              </g>
            ) : mood === 'apuntar_puntero' ? (
              <g {...armProps}>
                <path d={LEFT_ARM_IDLE} />
                <circle cx="43" cy="156" r="9.5" fill="#f8fbff" />
                <path d="M143 108 C157 102 171 94 183 89" />
                <circle cx="185" cy="88" r="9.5" fill="#f8fbff" />
                <circle cx="193" cy="85" r="4.5" fill="#f59e0b" className="animate-pulse" />
                <line
                  x1="193"
                  y1="85"
                  x2="199"
                  y2="82"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
              </g>
            ) : (
              <g {...armProps}>
                <path d={LEFT_ARM_IDLE} />
                <circle cx="43" cy="156" r="9.5" fill="#f8fbff" />
                <path d={RIGHT_ARM_IDLE} />
                <circle cx="157" cy="156" r="9.5" fill="#f8fbff" />
              </g>
            )}

            {/* PIERNAS: cápsulas redondeadas que nacen bajo el cuerpo */}
            <g filter={`url(#${softShadowId})`}>
              <rect
                x="78"
                y="156"
                width="21"
                height="36"
                rx="10.5"
                fill={`url(#${limbGradientId})`}
              />
              <rect
                x="101"
                y="156"
                width="21"
                height="36"
                rx="10.5"
                fill={`url(#${limbGradientId})`}
              />
            </g>
            <ellipse cx="100" cy="176" rx="30" ry="7" fill="#bfdbfe" opacity="0.45" />

            {/* CUERPO INFLABLE EN FORMA DE PERA */}
            <path
              d={BODY_PATH}
              fill={`url(#${bodyGradientId})`}
              stroke="#a9b8c9"
              strokeOpacity="0.55"
              strokeWidth="1.4"
            />

            {/* Sombras suaves para dar volumen sin salir del cuerpo */}
            <g clipPath={`url(#${bodyClipId})`}>
              <ellipse cx="76" cy="130" rx="24" ry="34" fill="#ffffff" opacity="0.7" />
              <ellipse cx="134" cy="142" rx="20" ry="30" fill="#bfdbfe" opacity="0.55" />
              <ellipse cx="100" cy="177" rx="50" ry="15" fill="#bfdbfe" opacity="0.55" />
            </g>

            {/* ARTICULACIONES REDONDEADAS DE LOS HOMBROS */}
            <g>
              <circle cx="59" cy="108" r="15" fill="#bae6fd" opacity="0.35" />
              <circle
                cx="59"
                cy="108"
                r="13"
                fill={`url(#${podGradientId})`}
                stroke="#7dd3fc"
                strokeOpacity="0.7"
                strokeWidth="1"
              />
              <ellipse
                cx="55"
                cy="103"
                rx="5"
                ry="3.5"
                fill="#ffffff"
                opacity="0.6"
                transform="rotate(-35 55 103)"
              />
              <circle cx="141" cy="108" r="15" fill="#bae6fd" opacity="0.35" />
              <circle
                cx="141"
                cy="108"
                r="13"
                fill={`url(#${podGradientId})`}
                stroke="#7dd3fc"
                strokeOpacity="0.7"
                strokeWidth="1"
              />
              <ellipse
                cx="145"
                cy="103"
                rx="5"
                ry="3.5"
                fill="#ffffff"
                opacity="0.6"
                transform="rotate(-35 145 103)"
              />
            </g>

            {/* INSIGNIA / PUERTO EN EL PECHO */}
            <circle
              cx="122"
              cy="104"
              r="8"
              fill="#f8fbff"
              stroke="#bae6fd"
              strokeWidth="2"
            />
            {mood === 'sin_senal' ? (
              <path
                d="M119 101 L125 107 M125 101 L119 107"
                stroke="#ef4444"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ) : (
              <circle cx="122" cy="104" r="3.2" fill={accent} className="animate-pulse" />
            )}

            {/* CABEZA REDONDEADA SIN COSTURA VISIBLE EN EL CUELLO */}
            <ellipse cx="100" cy="56" rx="33" ry="26" fill={`url(#${headGradientId})`} />
            <g clipPath={`url(#${headClipId})`}>
              <ellipse cx="100" cy="77" rx="32" ry="12" fill="#dbeafe" opacity="0.5" />
              <ellipse cx="86" cy="43" rx="15" ry="7" fill="#ffffff" opacity="0.8" />
            </g>
            {/* Contorno superior: define la cabeza sin dibujar una costura en el cuello */}
            <path
              d="M67 56 A33 26 0 0 1 133 56"
              stroke="#a9b8c9"
              strokeOpacity="0.6"
              strokeWidth="1.3"
              strokeLinecap="round"
            />

            {/* OJOS SEGÚN ESTADO ANÍMICO */}
            {(mood === 'idle_atento' || mood === 'apuntar_puntero') && (
              <g>
                <line
                  x1="91.5"
                  y1="54"
                  x2="108.5"
                  y2="54"
                  stroke="#0f172a"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
                <circle cx="87" cy="54" r="4.6" fill="#0f172a" />
                <circle cx="113" cy="54" r="4.6" fill="#0f172a" />
              </g>
            )}

            {mood === 'empujar_pantalla' && (
              <g stroke="#0f172a" strokeWidth="3" strokeLinecap="round">
                <path d="M82 55 Q87 50 92 55" />
                <path d="M108 55 Q113 50 118 55" />
              </g>
            )}

            {mood === 'buscar_antena' && (
              <g>
                <circle
                  cx="87"
                  cy="54"
                  r="7"
                  stroke={accent}
                  strokeWidth="2"
                  fill="none"
                  className="animate-pulse"
                />
                <circle cx="87" cy="54" r="2.5" fill={accent} />
                <circle
                  cx="113"
                  cy="54"
                  r="7"
                  stroke={accent}
                  strokeWidth="2"
                  fill="none"
                  className="animate-pulse"
                />
                <circle cx="113" cy="54" r="2.5" fill={accent} />
              </g>
            )}

            {mood === 'sin_senal' && (
              <g stroke="#ef4444" strokeWidth="2.6" strokeLinecap="round">
                <path d="M82 49 L90 57 M90 49 L82 57" />
                <path d="M110 49 L118 57 M118 49 L110 57" />
              </g>
            )}

            {mood === 'celebrar' && (
              <g stroke="#0f172a" strokeWidth="3" strokeLinecap="round" fill="none">
                <path d="M81 56 Q87 48 93 56" />
                <path d="M107 56 Q113 48 119 56" />
              </g>
            )}

            {/* Anillos de escaneo */}
            {mood === 'buscar_antena' && (
              <g fill="none" stroke={accent}>
                <circle
                  cx="100"
                  cy="56"
                  r="36"
                  strokeWidth="1.8"
                  opacity="0.55"
                  className="animate-ping"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
                <circle
                  cx="100"
                  cy="56"
                  r="47"
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
                cy="56"
                rx="39"
                ry="32"
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
