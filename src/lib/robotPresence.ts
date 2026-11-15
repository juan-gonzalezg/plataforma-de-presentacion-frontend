import { RobotPresence } from '../types';

/**
 * Presencia del robot en la vista de presentación (P02).
 *
 * Se guarda en una clave propia de localStorage (no en el snapshot de sesión)
 * porque es una preferencia de interfaz: sobrevive al borrado de la sesión y
 * no debe viajar en los respaldos JSON de la conversación.
 */
const ROBOT_PRESENCE_STORAGE_KEY = 'presentacion-robot-presence';

export const DEFAULT_ROBOT_PRESENCE: RobotPresence = 'discreto';

export const ROBOT_PRESENCE_ORDER: RobotPresence[] = [
  'completo',
  'discreto',
  'oculto'
];

export const ROBOT_PRESENCE_LABEL: Record<RobotPresence, string> = {
  completo: 'Completo',
  discreto: 'Discreto',
  oculto: 'Oculto'
};

export const ROBOT_PRESENCE_DESCRIPTION: Record<RobotPresence, string> = {
  completo: 'Robot animado con burbujas: ideal para ensayar o exponer sin público.',
  discreto: 'Robot pequeño y estático: no distrae y solo avisa con el color del LED.',
  oculto: 'Sin robot en la lámina: máxima limpieza para la audiencia.'
};

function isRobotPresence(value: unknown): value is RobotPresence {
  return value === 'completo' || value === 'discreto' || value === 'oculto';
}

export function readRobotPresence(): RobotPresence {
  if (typeof window === 'undefined') return DEFAULT_ROBOT_PRESENCE;
  try {
    const stored = window.localStorage.getItem(ROBOT_PRESENCE_STORAGE_KEY);
    return isRobotPresence(stored) ? stored : DEFAULT_ROBOT_PRESENCE;
  } catch {
    return DEFAULT_ROBOT_PRESENCE;
  }
}

export function saveRobotPresence(presence: RobotPresence): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ROBOT_PRESENCE_STORAGE_KEY, presence);
  } catch {
    // Modo privado o cuota llena: la preferencia solo dura la sesión actual.
  }
}

export function nextRobotPresence(current: RobotPresence): RobotPresence {
  const index = ROBOT_PRESENCE_ORDER.indexOf(current);
  return ROBOT_PRESENCE_ORDER[(index + 1) % ROBOT_PRESENCE_ORDER.length];
}
