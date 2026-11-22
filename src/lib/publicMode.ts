/**
 * Modo público.
 *
 * Los indicadores técnicos (state de RAG, LLM, búsqueda web, etc.) son útiles
 * mientras se desarrolla o se opera el despliegue, pero no deben mostrarse al
 * público. Se habilitan únicamente con `VITE_SHOW_INTERNAL_STATUS=true` en el
 * entorno de compilación; por defecto están ocultos.
 */
export const SHOW_INTERNAL_STATUS =
  import.meta.env.VITE_SHOW_INTERNAL_STATUS === 'true';
