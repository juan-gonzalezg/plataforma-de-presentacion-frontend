/**
 * URL base del backend FastAPI.
 *
 * - En desarrollo local (npm run dev): déjala vacía. Las rutas /api/*
 *   siguen funcionando gracias al proxy definido en vite.config.ts.
 * - En producción (Vercel u otro hosting estático): define la variable
 *   de entorno VITE_API_BASE_URL con la URL pública de tu backend
 *   desplegado (ej. en Render), sin barra final:
 *
 *     VITE_API_BASE_URL=https://tu-backend.onrender.com
 *
 * Sin esta variable configurada en producción, todas las llamadas a
 * /api/* apuntan al propio dominio del frontend, que no tiene backend
 * y por lo tanto no responde nada (la app se ve "vacía").
 */
export const API_BASE_URL: string = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
