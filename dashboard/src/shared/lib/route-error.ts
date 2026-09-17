import { isRouteErrorResponse } from 'react-router';

export type RouteErrorKind = 'chunk' | 'not-found' | 'unknown';

/**
 * Sahifa ichida tutilmagan xato (D-042) → nima deb ko'rsatish.
 *   chunk     — yangi versiya deploy bo'lgan, eski sahifa bo'lagi serverda
 *               yo'q ("Failed to fetch dynamically imported module"). Yechim —
 *               sahifani yangilash; bu dasturchi xatosi EMAS.
 *   not-found — marshrut topilmadi (404). "Ruxsat yo'q" DEYILMAYDI.
 *   unknown   — qolgani: kod xatosi. Ichki tafsilot (stack) ko'rsatilmaydi.
 */
export function classifyRouteError(error: unknown): RouteErrorKind {
  if (isRouteErrorResponse(error)) return error.status === 404 ? 'not-found' : 'unknown';
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  if (/dynamically imported module|Importing a module script failed|ChunkLoadError|error loading dynamically/i.test(message)) {
    return 'chunk';
  }
  return 'unknown';
}
