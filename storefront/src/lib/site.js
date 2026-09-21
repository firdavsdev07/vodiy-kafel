/**
 * Saytning ommaviy manzili (S-036, S-037).
 *
 * `canonical`, `og:url` va `sitemap.xml` uchun TO'LIQ manzil kerak —
 * nisbiy yo'l ijtimoiy tarmoq robotiga hech narsa demaydi.
 *
 * Manba `.env` (`VITE_SITE_URL`). Berilmasa:
 *   • brauzerda — o'sha paytdagi domen (preview va dev'da to'g'ri
 *     ishlaydi, hech qachon noto'g'ri domenga ishora qilmaydi)
 *   • build/skript paytida — production domeni
 */
const env = import.meta.env ?? {}

const FALLBACK = 'https://vodiykafel.uz'

export const SITE_URL = String(
  env.VITE_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : FALLBACK),
)
  .trim()
  .replace(/\/+$/, '')
