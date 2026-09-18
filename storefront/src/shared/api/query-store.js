import { isAbortError, requestEnvelope } from './client.js'
import { toApiError } from './api-error.js'
import { buildUrl } from './config.js'

/**
 * Server holati uchun eng kichik kesh (S-004).
 *
 * ⚠ TanStack Query ATAYLAB olinmadi: bu — ochiq, deyarli faqat O'QISH
 *   uchun sayt. Mutatsiya yo'q, optimistik yangilash yo'q, invalidatsiya
 *   daraxti yo'q. Kerak bo'lgani — bir marta so'rash, natijani eslab
 *   qolish va React'ga xabar berish. Shu uchta ish shu faylda.
 *
 * Kalit — to'liq URL (`buildUrl`). Ya'ni bir xil filtr bilan ikkinchi
 * marta kirilgan katalog qayta so'ralmaydi.
 */

/** Natija shuncha vaqt "yangi" hisoblanadi — undan keyin qayta so'raladi. */
const DEFAULT_STALE_MS = 5 * 60 * 1000

/**
 * Oxirgi tinglovchi ketganda so'rov DARHOL bekor qilinmaydi: React
 * StrictMode (dev) har bir effektni qo'shimcha bir marta yechib-ulaydi,
 * shuningdek sahifa ichida qayta render ham shunday ko'rinadi. Shu qisqa
 * fursat ikkalasini ham bekorga so'rov qaytarishdan saqlaydi.
 */
const ABORT_GRACE_MS = 60

/** Noma'lum kalit uchun bitta o'zgarmas holat — `useSyncExternalStore` uni qayta render deb o'qimasin. */
export const IDLE_STATE = Object.freeze({
  status: 'idle',
  data: undefined,
  meta: undefined,
  error: null,
  updatedAt: 0,
})

/** key → { state, listeners, promise, controller, abortTimer } */
const entries = new Map()

function ensure(key) {
  let entry = entries.get(key)
  if (!entry) {
    entry = {
      state: IDLE_STATE,
      listeners: new Set(),
      promise: null,
      controller: null,
      abortTimer: null,
      // Qayta so'rash uchun (invalidatsiya) — kalitning o'zidan yo'l va
      // parametrlarni qayta ajratib olish shart bo'lmasin.
      request: null,
    }
    entries.set(key, entry)
  }
  return entry
}

function setState(key, patch) {
  const entry = ensure(key)
  entry.state = { ...entry.state, ...patch }
  for (const listener of entry.listeners) listener()
}

/** Kalitning joriy holati. Havola o'zgarmagan bo'lsa — React qayta render qilmaydi. */
export function readQuery(key) {
  return entries.get(key)?.state ?? IDLE_STATE
}

export function subscribeQuery(key, listener) {
  const entry = ensure(key)
  entry.listeners.add(listener)
  if (entry.abortTimer) {
    clearTimeout(entry.abortTimer)
    entry.abortTimer = null
  }

  return () => {
    entry.listeners.delete(listener)
    if (entry.listeners.size > 0 || !entry.controller) return
    // Hech kim kutmayotgan so'rov — bekor qilinadi (sahifa almashdi).
    entry.abortTimer = setTimeout(() => {
      entry.abortTimer = null
      if (entry.listeners.size === 0) entry.controller?.abort()
    }, ABORT_GRACE_MS)
  }
}

/**
 * So'rovni bajaradi (yoki keshdagini qaytaradi).
 * Bir vaqtda kelgan bir xil so'rovlar bitta `fetch` ga birlashadi.
 */
export function fetchQuery(key, { path, params, staleMs = DEFAULT_STALE_MS, force = false } = {}) {
  const entry = ensure(key)
  if (path) entry.request = { path, params }
  const request = entry.request

  if (entry.promise) return entry.promise
  // Yo'li noma'lum kalit (faqat `primeQuery` bilan to'ldirilgan) — so'ralmaydi.
  if (!request) return Promise.resolve(entry.state.data)
  const isFresh = entry.state.status === 'success' && Date.now() - entry.state.updatedAt < staleMs
  if (isFresh && !force) return Promise.resolve(entry.state.data)

  const controller = new AbortController()
  entry.controller = controller
  setState(key, { status: 'loading', error: null })

  const promise = requestEnvelope(request.path, { params: request.params, signal: controller.signal })
    .then(({ data, meta }) => {
      setState(key, { status: 'success', data, meta, error: null, updatedAt: Date.now() })
      return data
    })
    .catch((cause) => {
      if (isAbortError(cause)) {
        // Bekor qilingan so'rov xato emas: oldingi ma'lumot bor bo'lsa
        // u joyida qoladi, bo'lmasa kalit boshlang'ich holatga qaytadi.
        setState(key, { status: entry.state.data === undefined ? 'idle' : 'success' })
      } else {
        setState(key, { status: 'error', error: toApiError(cause) })
      }
      throw cause
    })
    .finally(() => {
      if (entry.promise === promise) {
        entry.promise = null
        entry.controller = null
      }
    })

  entry.promise = promise
  return promise
}

/**
 * Keshni bo'shatadi. `prefix` berilsa — faqat shu bilan boshlanadigan
 * kalitlar (masalan `invalidateQueries('/products')`).
 * Ochiq sahifalar darhol qayta so'raydi, qolgan yozuvlar o'chiriladi.
 */
export function invalidateQueries(prefix) {
  for (const [key, entry] of entries) {
    if (prefix && !key.includes(prefix)) continue
    if (entry.listeners.size > 0 && entry.request) fetchQuery(key, { force: true }).catch(() => {})
    else entries.delete(key)
  }
}

/** Kalitni qo'lda tayyorlash — prerender (S-038) yoki test uchun. */
export function primeQuery(path, params, data) {
  const key = buildUrl(path, params)
  setState(key, { status: 'success', data, error: null, updatedAt: Date.now() })
  return key
}

/** Testlar uchun: hammasini unutish. */
export function resetQueries() {
  for (const entry of entries.values()) entry.controller?.abort()
  entries.clear()
}
