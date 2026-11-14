import React from 'react';
import { RobotMood } from '../types';
import { ASSISTANT_NAME } from '../lib/brand';

interface RobotAvatarProps {
  mood: RobotMood;
  speechBubble?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  className?: string;
  onClick?: () => void;
  /** El usuario está redactando: el robot se asoma con curiosidad. */
  isTyping?: boolean;
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

/** Contorno oscuro de la ficha del personaje. */
const INK = '#1E293B';

/** Azul cian de los ojos LED. */
const EYE = '#38BDF8';

/** Rojo de alerta cuando se pierde la conexión. */
const ALERT = '#FB7185';

type ArmPose = { x: number; y: number; angle: number };

/**
 * Pose de los brazos (cápsulas flotantes estilo EVE). Cada brazo se dibuja
 * desde el hombro con una rotación: 0° cuelga recto, valores negativos abren
 * hacia fuera y los positivos apuntan hacia el contenido.
 */
const ARM_POSES: Record<RobotMood, { left: ArmPose; right: ArmPose }> = {
  idle_atento: {
    left: { x: 58, y: 120, angle: -8 },
    right: { x: 142, y: 120, angle: 8 }
  },
  apuntar_puntero: {
    left: { x: 58, y: 118, angle: 105 },
    right: { x: 142, y: 120, angle: 8 }
  },
  empujar_pantalla: {
    left: { x: 58, y: 118, angle: 40 },
    right: { x: 142, y: 118, angle: -40 }
  },
  buscar_antena: {
    left: { x: 58, y: 120, angle: -6 },
    right: { x: 142, y: 116, angle: -130 }
  },
  sin_senal: {
    left: { x: 58, y: 120, angle: 22 },
    right: { x: 142, y: 120, angle: -22 }
  },
  celebrar: {
    left: { x: 58, y: 118, angle: 118 },
    right: { x: 142, y: 118, angle: -118 }
  }
};

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  mood,
  speechBubble,
  size = 'md',
  className = '',
  onClick,
  isTyping = false
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
  const haloGradientId = `logos-halo-${uid}`;
  const shellGradientId = `logos-shell-${uid}`;
  const vestGradientId = `logos-vest-${uid}`;
  const visorGradientId = `logos-visor-${uid}`;
  const visorAlertGradientId = `logos-visor-alert-${uid}`;
  const visorClipId = `logos-visor-clip-${uid}`;
  const glowFilterId = `logos-glow-${uid}`;

  const isAlert = mood === 'sin_senal';
  const led = isAlert ? ALERT : EYE;
  const pose = ARM_POSES[mood];

  // Comportamiento del cuerpo completo (ficha del personaje).
  const rootAnimation = isTyping
    ? 'robot-peek'
    : mood === 'celebrar'
      ? 'robot-happy'
      : mood === 'empujar_pantalla'
        ? 'robot-peek'
        : 'robot-float';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  /** Cápsula flotante con un pequeño LED en la mano. */
  const renderArm = (arm: ArmPose) => (
    <g transform={`translate(${arm.x} ${arm.y}) rotate(${arm.angle})`}>
      <rect
        x={-7}
        y={0}
        width={14}
        height={34}
        rx={7}
        fill={`url(#${shellGradientId})`}
        stroke={INK}
        strokeWidth={3.5}
      />
      <circle cx={0} cy={27} r={2} fill={led} opacity={0.85} />
    </g>
  );

  /** Ojos LED con expresividad según el estado. */
  const renderEyes = () => {
    if (isAlert) {
      return (
        <g filter={`url(#${glowFilterId})`}>
          <rect x={70} y={50} width={22} height={26} rx={9} fill={ALERT} />
          <rect x={108} y={50} width={22} height={26} rx={9} fill={ALERT} />
        </g>
      );
    }

    const eyeClass =
      mood === 'buscar_antena'
        ? 'robot-blink'
        : mood === 'celebrar'
          ? 'animate-pulse'
          : undefined;

    return (
      <g className={eyeClass} filter={`url(#${glowFilterId})`}>
        <rect x={70} y={50} width={22} height={26} rx={9} fill={EYE} />
        {mood === 'apuntar_puntero' ? (
          // Guiño: el ojo derecho se entrecierra.
          <rect x={108} y={62} width={22} height={14} rx={7} fill={EYE} />
        ) : (
          <rect x={108} y={50} width={22} height={26} rx={9} fill={EYE} />
        )}
        {/* Brillo del LED */}
        <rect x={74} y={54} width={6} height={6} rx={2} fill="#E0F2FE" opacity={0.55} />
        <rect
          x={112}
          y={mood === 'apuntar_puntero' ? 66 : 54}
          width={6}
          height={6}
          rx={2}
          fill="#E0F2FE"
          opacity={0.55}
        />
      </g>
    );
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
        <div className="absolute -top-14 z-30 max-w-[15rem] px-3.5 py-2 rounded-2xl bg-slate-900/95 border border-cyan-400/50 text-[11px] font-medium leading-snug text-cyan-100 shadow-xl shadow-cyan-500/20 backdrop-blur-md">
          <div className="line-clamp-2">{speechBubble}</div>
          {/* Triangulito de la burbuja */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-[2px] bg-slate-900 border-b border-r border-cyan-400/50 transform rotate-45" />
        </div>
      )}

      {/* SVG del asistente: chibi con visor, chaleco y extremidades flotantes */}
      <div className={`relative ${sizeMap[size]} transition-all duration-300`}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full overflow-visible drop-shadow-[0_12px_22px_rgba(56,189,248,0.18)] drop-shadow-[0_4px_10px_rgba(2,6,23,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label={`${ASSISTANT_NAME}, robot asistente`}
        >
          <defs>
            {/* Halo suave detrás del robot */}
            <radialGradient id={haloGradientId} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={led} stopOpacity={0.24} />
              <stop offset="55%" stopColor={led} stopOpacity={0.08} />
              <stop offset="100%" stopColor={led} stopOpacity={0} />
            </radialGradient>

            {/* Carcasa gris clara con volumen */}
            <linearGradient id={shellGradientId} x1="0%" y1="0%" x2="30%" y2="100%">
              <stop offset="0%" stopColor="#E8EDF3" />
              <stop offset="55%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#B7C4D4" />
            </linearGradient>

            {/* Chaleco azul formal */}
            <linearGradient id={vestGradientId} x1="0%" y1="0%" x2="25%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="55%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>

            {/* Cristal oscuro del visor */}
            <linearGradient id={visorGradientId} x1="0%" y1="0%" x2="40%" y2="100%">
              <stop offset="0%" stopColor="#0B1120" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            <linearGradient id={visorAlertGradientId} x1="0%" y1="0%" x2="40%" y2="100%">
              <stop offset="0%" stopColor="#22090F" />
              <stop offset="100%" stopColor="#3B111C" />
            </linearGradient>

            <filter id={glowFilterId} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <clipPath id={visorClipId}>
              <rect x="50" y="30" width="100" height="62" rx="24" />
            </clipPath>
          </defs>

          {/* Halo ambiental */}
          <ellipse cx="100" cy="82" rx="88" ry="78" fill={`url(#${haloGradientId})`} />

          {/* Sombra en el suelo */}
          <ellipse cx="100" cy="194" rx="40" ry="5" fill="#020617" opacity={0.4} />
          <ellipse cx="100" cy="194" rx="22" ry="3" fill={led} opacity={0.18} />

          {/* Anillos de escaneo al pensar (detrás del robot) */}
          {mood === 'buscar_antena' && (
            <g fill="none" stroke={EYE}>
              <circle
                cx={100}
                cy={60}
                r={66}
                strokeWidth="2"
                className="robot-scan"
              />
              <circle
                cx={100}
                cy={60}
                r={74}
                strokeWidth="1.4"
                className="robot-scan"
                style={{ animationDelay: '320ms' }}
              />
            </g>
          )}

          {/* Aviso de error alrededor de la cabeza */}
          {isAlert && (
            <ellipse
              cx={100}
              cy={60}
              rx={80}
              ry={58}
              fill="none"
              stroke={ALERT}
              strokeWidth="1.8"
              strokeOpacity={0.45}
              strokeDasharray="5 7"
              className="animate-pulse"
            />
          )}

          <g className={rootAnimation}>
            {/* Pies flotantes: bloques con la misma geometría de la cabeza */}
            <g className="robot-limb">
              <rect
                x={76}
                y={172}
                width={22}
                height={20}
                rx={7}
                fill={`url(#${shellGradientId})`}
                stroke={INK}
                strokeWidth={4.5}
              />
              <rect
                x={102}
                y={172}
                width={22}
                height={20}
                rx={7}
                fill={`url(#${shellGradientId})`}
                stroke={INK}
                strokeWidth={4.5}
              />
              <path d="M81 178 H93" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" opacity={0.7} />
              <path d="M107 178 H119" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" opacity={0.7} />
            </g>

            {/* Brazos flotantes estilo EVE */}
            <g className="robot-limb" style={{ animationDelay: '180ms' }}>
              {renderArm(pose.left)}
              {renderArm(pose.right)}
            </g>

            {/* Cuello */}
            <rect
              x={88}
              y={98}
              width={24}
              height={20}
              rx={9}
              fill="#94A3B8"
              stroke={INK}
              strokeWidth={3.5}
            />

            {/* Torso: chaleco formal con camisa y corbata */}
            <rect
              x={66}
              y={112}
              width={68}
              height={54}
              rx={20}
              fill={`url(#${vestGradientId})`}
              stroke={INK}
              strokeWidth={4.5}
            />
            {/* Camisa blanca en V */}
            <path d="M88 113 L100 140 L112 113 Z" fill="#FFFFFF" />
            <path
              d="M88 113 L100 140 L112 113"
              fill="none"
              stroke="#1D4ED8"
              strokeWidth="2"
              strokeOpacity={0.45}
            />
            {/* Corbata oscura */}
            <path d="M96.8 121 L103.2 121 L102.5 126.5 L97.5 126.5 Z" fill={INK} />
            <path d="M97.5 126.5 L102.5 126.5 L103.3 133.5 L100 137 L96.7 133.5 Z" fill={INK} />
            <path d="M100 128.5 V134" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
            {/* Botones del chaleco */}
            <circle cx={100} cy={150} r={1.6} fill={INK} opacity={0.75} />
            <circle cx={100} cy={158} r={1.6} fill={INK} opacity={0.75} />

            {/* Cabeza: bloque horizontal dominante */}
            <g className={`robot-head ${mood === 'buscar_antena' ? 'robot-head--tilt' : ''}`}>
              {/* Cápsulas laterales (antenas/orejas) */}
              <rect
                x={24}
                y={48}
                width={16}
                height={32}
                rx={8}
                fill={`url(#${shellGradientId})`}
                stroke={INK}
                strokeWidth={3.5}
              />
              <rect
                x={160}
                y={48}
                width={16}
                height={32}
                rx={8}
                fill={`url(#${shellGradientId})`}
                stroke={INK}
                strokeWidth={3.5}
              />
              <circle cx={32} cy={57} r={2.4} fill={led} filter={`url(#${glowFilterId})`} />
              <circle cx={168} cy={57} r={2.4} fill={led} filter={`url(#${glowFilterId})`} />

              {/* Marco exterior */}
              <rect
                x={38}
                y={16}
                width={124}
                height={88}
                rx={38}
                fill={`url(#${shellGradientId})`}
                stroke={INK}
                strokeWidth={4.5}
              />
              {/* Brillo superior de la carcasa */}
              <path
                d="M54 28 C70 20 130 20 146 28"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
                opacity={0.55}
              />

              {/* Pantalla del visor */}
              <rect
                x={50}
                y={30}
                width={100}
                height={62}
                rx={24}
                fill={`url(#${isAlert ? visorAlertGradientId : visorGradientId})`}
                stroke={INK}
                strokeWidth="3"
              />
              <g clipPath={`url(#${visorClipId})`}>
                {/* Reflejo del cristal */}
                <path d="M56 48 L80 33 L96 33 L66 62 Z" fill="#FFFFFF" opacity={0.06} />
                <path d="M50 82 H150" stroke={EYE} strokeWidth="1" opacity={0.12} />
              </g>
              <rect
                x={53}
                y={33}
                width={94}
                height={56}
                rx={21}
                fill="none"
                stroke={led}
                strokeOpacity={0.22}
                strokeWidth="1.2"
              />

              {/* Ojos LED */}
              {renderEyes()}
            </g>
          </g>

          {/* Chispas de celebración */}
          {mood === 'celebrar' && (
            <g>
              <circle cx={30} cy={40} r={3.2} fill="#38BDF8" className="animate-pulse" />
              <circle
                cx={170}
                cy={44}
                r={2.8}
                fill="#FBBF24"
                className="animate-pulse"
                style={{ animationDelay: '150ms' }}
              />
              <circle
                cx={46}
                cy={18}
                r={2.4}
                fill="#A855F7"
                className="animate-pulse"
                style={{ animationDelay: '300ms' }}
              />
              <circle
                cx={154}
                cy={16}
                r={3}
                fill="#34D399"
                className="animate-pulse"
                style={{ animationDelay: '450ms' }}
              />
              <circle
                cx={26}
                cy={120}
                r={2.4}
                fill="#FBBF24"
                className="animate-pulse"
                style={{ animationDelay: '600ms' }}
              />
              <circle
                cx={174}
                cy={124}
                r={2.6}
                fill="#38BDF8"
                className="animate-pulse"
                style={{ animationDelay: '750ms' }}
              />
            </g>
          )}
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
