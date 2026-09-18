import { ApiError } from './api-error.js'
import { buildUrl } from './config.js'

/**
 * Yupqa `fetch` o'ramchisi (S-004).
 *
 * Nima qiladi:
 *   • `{ data, meta }` o'ramini OCHADI — chaqiruvchi `data` ni oladi
 *   • har qanday xatoni `ApiError` ga aylantiradi
 *   • `AbortSignal` ni uzatadi — sahifa almashsa so'rov bekor qilinadi
 *   • javob kelmasa o'zi to'xtaydi (`REQUEST_TIMEOUT_MS`)
 *
 * Nima QILMAYDI: `Authorization` sarlavhasini qo'ymaydi. Bu — ochiq sayt,
 * unda hisob yo'q (G1). Token kerak bo'lgan hamma narsa `dashboard/` da.
 */

/** Javobni cheksiz kutib o'tirmaymiz — S-031 uchun aniq xato kerak. */
export const REQUEST_TIMEOUT_MS = 15_000

/** Bekor qilingan so'rovmi — bu xato EMAS, uni ko'rsatish shart emas. */
export function isAbortError(error) {
  return error?.name === 'AbortError'
}

/** Taymer to'xtatganini bekor qilishdan ajratish uchun belgi. */
const TIMEOUT_REASON = { name: 'TimeoutError' }

/**
 * Tashqi `signal` va ichki taymer — ikkalasini bitta signalga qo'shadi.
 * (`AbortSignal.any` eski brauzerlarda yo'q, shuning uchun qo'lda.)
 */
function combineSignals(external, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(TIMEOUT_REASON), timeoutMs)
  const forward = () => controller.abort(external.reason)

  if (external) {
    if (external.aborted) forward()
    else external.addEventListener('abort', forward, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer)
      external?.removeEventListener('abort', forward)
    },
  }
}

/** Javob tanasini o'qiydi. Bo'sh (204) yoki JSON bo'lmasa — `null`. */
async function readJson(response) {
  if (response.status === 204) return null
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Asosiy so'rov. `{ data, meta, requestId }` qaytaradi.
 *
 * ⚠ Sahifalash `meta` da EMAS, `data` ning ICHIDA keladi:
 *   `{ data: { items, total, page, limit, totalPages } }`
 *   (`api/src/common/dto/paginated-response.dto.ts`). `meta` hozircha
 *   bo'sh — backend uni zaxira sifatida qoldirgan.
 */
export async function requestEnvelope(path, options = {}) {
  const { method = 'GET', params, body, signal, headers, timeoutMs = REQUEST_TIMEOUT_MS } = options
  const url = buildUrl(path, params)
  const { signal: requestSignal, cleanup } = combineSignals(signal, timeoutMs)

  let response
  try {
    response = await fetch(url, {
      method,
      signal: requestSignal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? null : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    // Taymer to'xtatdimi yoki chaqiruvchi bekor qildimi — farqi bor:
    // birinchisi ko'rsatiladigan xato, ikkinchisi jim o'tadi.
    if (requestSignal.reason === TIMEOUT_REASON) throw ApiError.timeout(cause)
    if (isAbortError(cause)) throw cause
    throw ApiError.network(cause)
  } finally {
    cleanup()
  }

  const payload = await readJson(response)
  if (!response.ok) throw ApiError.fromResponse(response, payload)

  return {
    data: payload?.data,
    meta: payload?.meta,
    // CORS'da ko'rinadi: `exposedHeaders: ['X-Request-Id']` (api/src/main.ts)
    requestId: response.headers.get('X-Request-Id'),
  }
}

/** Ko'p hollarda faqat `data` kerak. */
export async function apiGet(path, options) {
  const { data } = await requestEnvelope(path, { ...options, method: 'GET' })
  return data
}

export async function apiPost(path, body, options) {
  const { data } = await requestEnvelope(path, { ...options, method: 'POST', body })
  return data
}
