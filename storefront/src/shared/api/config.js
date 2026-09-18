/**
 * API manzili va undan kelib chiqadigan yordamchi funksiyalar (S-004).
 *
 * Manzil `.env` dan keladi (`VITE_API_URL`), chunki dev, preview va
 * production uchun u har xil. `.env.example` da namunasi bor.
 *
 * ⚠ TOKEN YO'Q. Bu paket — ochiq reklama sayti (G1): hisob, kirish,
 *   `Authorization` sarlavhasi bu yerda UMUMAN ishlatilmaydi.
 */

// `import.meta.env` Vite'da doim bor; `?? {}` — modul oddiy Node ostida
// (test yoki skript) import qilinganda yiqilmasligi uchun.
const env = import.meta.env ?? {}

/**
 * `VITE_API_URL` berilmasa:
 *   dev  — mahalliy backend (`pnpm start:dev` shu portda turadi)
 *   prod — sayt bilan bir domen; ya'ni noto'g'ri manzil jimgina
 *          `localhost` ga ketib qolmaydi
 */
const FALLBACK_BASE = env.PROD ? '/api/v1' : 'http://localhost:3000/api/v1'

/** Oxiridagi `/` olib tashlanadi — yo'l qo'shilganda ikkilanmasin. */
export const API_BASE_URL = String(env.VITE_API_URL || FALLBACK_BASE).trim().replace(/\/+$/, '')

/**
 * Yuklangan fayllar (`/uploads/...`) global prefiksga KIRMAYDI
 * (`api/src/main.ts`), shuning uchun ular uchun manzilning faqat
 * domen qismi kerak.
 */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+$/, '')

if (env.DEV && !env.VITE_API_URL) {
  console.info(`[api] VITE_API_URL berilmagan — ${API_BASE_URL} ishlatilmoqda`)
}

/**
 * Query parametrlarini yig'adi. `undefined`, `null` va bo'sh satr
 * TASHLANADI — aks holda `?search=` kabi bo'sh filtrlar serverga borardi.
 * Kalitlar saralanadi: `{a,b}` va `{b,a}` bitta kesh yozuviga tushsin.
 */
export function buildQuery(params) {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const list = Array.isArray(value) ? value : [value]
    for (const item of list) {
      if (item === undefined || item === null || item === '') continue
      search.append(key, String(item))
    }
  }
  search.sort()
  return search.toString()
}

/** To'liq so'rov manzili. Shu satr ayni paytda kesh KALITI ham bo'ladi. */
export function buildUrl(path, params) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  const query = buildQuery(params)
  return query ? `${url}?${query}` : url
}

/**
 * Backend qaytargan fayl yo'lini (`/uploads/products/x.webp`) to'liq
 * manzilga aylantiradi. Tashqi (`https://…`) yoki `data:` manzil
 * tegilmaydi — rasm allaqachon to'liq bo'lsa, buzilmasin.
 */
export function assetUrl(path) {
  if (!path) return ''
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}
