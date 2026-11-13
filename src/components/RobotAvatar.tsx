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

const INK = '#0b1220';

const BODY_PATH =
  'M100 78 C82 80 70 88 62 102 C52 118 47 136 49 152 C51 170 72 182 100 182 C128 182 149 170 151 152 C153 136 148 118 138 102 C130 88 118 80 100 78 Z';

const HEAD_CY = 58;

const LEFT_ARM_IDLE = 'M74 100 C58 116 52 134 54 150';
const RIGHT_ARM_IDLE = 'M126 100 C142 116 148 134 146 150';
const RIGHT_ARM_RAISED = 'M126 100 C148 92 158 70 150 44';
const RIGHT_ARM_POINT = 'M126 100 C148 96 170 90 186 84';
const RIGHT_ARM_PUSH = 'M126 100 C148 98 168 96 182 92';

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
  const headClipId = `logos-head-clip-${uid}`;

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

  /** Cápsula con contorno negro grueso y relleno blanco. */
  const renderArm = (d: string) => (
    <g key={d}>
      <path
        d={d}
        fill="none"
        stroke={INK}
        strokeWidth={28}
        strokeLinecap="round"
      />
      <path
        d={d}
        fill="none"
        stroke={`url(#${limbGradientId})`}
        strokeWidth={20}
        strokeLinecap="round"
      />
    </g>
  );

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

      {/* SVG del asistente: ilustración 2D con contorno negro */}
      <div className={`relative ${sizeMap[size]} transition-all duration-300`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_10px_18px_rgba(34,211,238,0.16)] drop-shadow-[0_4px_8px_rgba(15,23,42,0.18)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`${ASSISTANT_NAME}, robot asistente`}
        >
          <defs>
            <linearGradient id={bodyGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="60%" stopColor="#fbfdff" />
              <stop offset="100%" stopColor="#eef3f8" />
            </linearGradient>
            <linearGradient id={headGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#fbfdff" />
              <stop offset="100%" stopColor="#f0f5fa" />
            </linearGradient>
            <linearGradient id={limbGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e8eef5" />
            </linearGradient>
            <clipPath id={bodyClipId}>
              <path d={BODY_PATH} />
            </clipPath>
            <clipPath id={headClipId}>
              <ellipse cx="100" cy={HEAD_CY} rx="33" ry="26" />
            </clipPath>
          </defs>

          {/* Sombra proyectada en el suelo */}
          <ellipse cx="100" cy="194" rx="46" ry="6.5" fill="#020617" opacity="0.5" />
          <ellipse cx="100" cy="194" rx="34" ry="4.5" fill="#22d3ee" opacity="0.14" />

          {/* Grupo principal con animación de flotación / empuje */}
          <g className={`origin-center transition-all duration-300 ${bodyAnimation}`}>
            {/* PIERNAS: cápsulas con contorno, nacen bajo el cuerpo */}
            <g>
              <rect
                x="73"
                y="152"
                width="24"
                height="40"
                rx="12"
                fill={`url(#${limbGradientId})`}
                stroke={INK}
                strokeWidth="5"
              />
              <rect
                x="103"
                y="152"
                width="24"
                height="40"
                rx="12"
                fill={`url(#${limbGradientId})`}
                stroke={INK}
                strokeWidth="5"
              />
            </g>

            {/* CUERPO INFLABLE EN FORMA DE PERA */}
            <path
              d={BODY_PATH}
              fill={`url(#${bodyGradientId})`}
              stroke={INK}
              strokeWidth="5.5"
              strokeLinejoin="round"
            />

            {/* Sombras grises interiores */}
            <g clipPath={`url(#${bodyClipId})`}>
              <ellipse cx="140" cy="140" rx="20" ry="34" fill="#e2e8f0" />
              <ellipse cx="148" cy="142" rx="10" ry="28" fill="#cbd5e1" opacity="0.55" />
              <ellipse cx="100" cy="180" rx="48" ry="14" fill="#e2e8f0" />
              <ellipse cx="100" cy="84" rx="30" ry="10" fill="#e2e8f0" opacity="0.8" />
            </g>

            {/* LÍNEA DEL PECHO */}
            <path
              d="M67 112 C83 118 117 118 133 112"
              stroke={INK}
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* INSIGNIA CON LA ONDA */}
            <circle
              cx="100"
              cy="96"
              r="8.5"
              fill="#ffffff"
              stroke={INK}
              strokeWidth="3"
            />
            {mood === 'sin_senal' ? (
              <path
                d="M96.5 93 L103.5 100 M103.5 93 L96.5 100"
                stroke="#dc2626"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M95.5 96 Q98 93 100 96 Q102 99 104.5 96"
                stroke={INK}
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
                className={mood === 'buscar_antena' ? 'animate-pulse' : undefined}
              />
            )}

            {/* BRAZOS DELANTE DEL CUERPO: hombro redondeado visible */}
            {mood === 'apuntar_puntero'
              ? renderArm(RIGHT_ARM_POINT)
              : mood === 'empujar_pantalla'
                ? renderArm(RIGHT_ARM_PUSH)
                : mood === 'celebrar'
                  ? renderArm(RIGHT_ARM_RAISED)
                  : renderArm(RIGHT_ARM_IDLE)}

            {renderArm(LEFT_ARM_IDLE)}

            {/* CABEZA CON CONTORNO COMPLETO */}
            <ellipse
              cx="100"
              cy={HEAD_CY}
              rx="33"
              ry="26"
              fill={`url(#${headGradientId})`}
              stroke={INK}
              strokeWidth="5.5"
            />
            <g clipPath={`url(#${headClipId})`}>
              <ellipse cx="116" cy="71" rx="17" ry="11" fill="#e2e8f0" opacity="0.8" />
              <ellipse cx="84" cy="45" rx="16" ry="7" fill="#ffffff" />
            </g>

            {/* OJOS SEGÚN ESTADO ANÍMICO */}
            {(mood === 'idle_atento' || mood === 'apuntar_puntero') && (
              <g>
                <line
                  x1="92"
                  y1="56"
                  x2="108"
                  y2="56"
                  stroke={INK}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <circle cx="87" cy="56" r="5.2" fill={INK} />
                <circle cx="113" cy="56" r="5.2" fill={INK} />
              </g>
            )}

            {mood === 'empujar_pantalla' && (
              <g stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none">
                <path d="M82 57 Q87 53 92 57" />
                <path d="M108 57 Q113 53 118 57" />
              </g>
            )}

            {mood === 'buscar_antena' && (
              <g>
                <circle
                  cx="87"
                  cy="56"
                  r="7.5"
                  stroke={INK}
                  strokeWidth="2.5"
                  fill="none"
                  className="animate-pulse"
                />
                <circle cx="87" cy="56" r="2.5" fill={INK} />
                <circle
                  cx="113"
                  cy="56"
                  r="7.5"
                  stroke={INK}
                  strokeWidth="2.5"
                  fill="none"
                  className="animate-pulse"
                />
                <circle cx="113" cy="56" r="2.5" fill={INK} />
              </g>
            )}

            {mood === 'sin_senal' && (
              <g stroke="#dc2626" strokeWidth="3.2" strokeLinecap="round">
                <path d="M82 51 L90 59 M90 51 L82 59" />
                <path d="M110 51 L118 59 M118 51 L110 59" />
              </g>
            )}

            {mood === 'celebrar' && (
              <g stroke={INK} strokeWidth="3.8" strokeLinecap="round" fill="none">
                <path d="M81 58 Q87 50 93 58" />
                <path d="M107 58 Q113 50 119 58" />
              </g>
            )}

            {/* Anillos de escaneo */}
            {mood === 'buscar_antena' && (
              <g fill="none" stroke="#94a3b8">
                <circle
                  cx="100"
                  cy={HEAD_CY}
                  r="36"
                  strokeWidth="2.5"
                  opacity="0.8"
                  className="animate-ping"
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
                <circle
                  cx="100"
                  cy={HEAD_CY}
                  r="47"
                  strokeWidth="1.8"
                  opacity="0.5"
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
                cy={HEAD_CY}
                rx="39"
                ry="32"
                fill="none"
                stroke="#dc2626"
                strokeWidth="1.8"
                opacity="0.6"
                strokeDasharray="5 4"
              />
            )}

            {/* Chispas de celebración */}
            {mood === 'celebrar' && (
              <g fill="#94a3b8">
                <circle cx="42" cy="48" r="3" className="animate-pulse" />
                <circle
                  cx="158"
                  cy="48"
                  r="3"
                  className="animate-pulse"
                  style={{ animationDelay: '150ms' }}
                />
                <circle
                  cx="54"
                  cy="26"
                  r="2.5"
                  className="animate-pulse"
                  style={{ animationDelay: '300ms' }}
                />
                <circle
                  cx="146"
                  cy="26"
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
