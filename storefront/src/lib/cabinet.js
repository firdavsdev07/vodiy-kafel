/**
 * Optom mijoz kabinetining manzili (S-045).
 *
 * Kabinet `dashboard/` paketida (`/kabinet/*`) — storefront faqat unga
 * HAVOLA beradi. ⚠ Bu yerda login formasi, token yoki `/me/*` so'rovi
 * YO'Q va bo'lmaydi (G1): sayt — ochiq reklama sayti.
 *
 * Manba `.env` (`VITE_CABINET_URL`, kabinet ilovasining domeni). Havola
 * `/kabinet` ga olib boradi: kirmagan mijozni kabinetning o'zi
 * `/kabinet/kirish` ga yo'naltiradi, kirgan mijoz esa to'g'ridan-to'g'ri
 * ichkariga tushadi.
 *
 * Berilmasa:
 *   dev  — mahalliy dashboard (`pnpm dev`, 5174-port)
 *   prod — sayt bilan bir domen; noto'g'ri manzil jimgina `localhost`
 *          ga ketib qolmaydi
 */
const env = import.meta.env ?? {}

const FALLBACK = env.PROD ? '' : 'http://localhost:5174'

export const CABINET_ORIGIN = String(env.VITE_CABINET_URL || FALLBACK)
  .trim()
  .replace(/\/+$/, '')

export const CABINET_URL = `${CABINET_ORIGIN}/kabinet`
