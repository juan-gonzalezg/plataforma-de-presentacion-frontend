/**
 * Estado de "guía ya vista" por vista.
 *
 * Es una preferencia de interfaz: se guarda en su propia clave de localStorage
 * y no viaja en los respaldos de sesión. Si localStorage falla (modo privado o
 * cuota llena), la guía simplemente puede volver a aparecer en la próxima
 * visita, sin romper la aplicación.
 */

export type GuideView = 'home' | 'study';

const GUIDE_SEEN_STORAGE_KEY = 'presentacion-guide-seen';

type SeenMap = Partial<Record<GuideView, boolean>>;

function readSeen(): SeenMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(GUIDE_SEEN_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as SeenMap) : {};
  } catch {
    return {};
  }
}

export function hasSeenGuide(view: GuideView): boolean {
  return readSeen()[view] === true;
}

export function markGuideSeen(view: GuideView): void {
  if (typeof window === 'undefined') return;
  try {
    const seen = readSeen();
    seen[view] = true;
    window.localStorage.setItem(GUIDE_SEEN_STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // La preferencia solo dura la sesión actual; no afecta a la funcionalidad.
  }
}
