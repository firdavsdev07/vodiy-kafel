/**
 * Backend xatosining bitta ko'rinishi (S-004).
 *
 * Server har qanday xatoni shu formatda qaytaradi (`api/docs/error-codes.md`):
 *   { statusCode, error, message, path, timestamp, requestId }
 *
 * `message` — validatsiya xatosida MASSIV, boshqa hollarda bitta satr.
 * Shu sinf ikkalasini ham bir xil qabul qiladi: `error.message` har doim
 * ko'rsatsa bo'ladigan satr, `error.messages` — to'liq ro'yxat.
 */

/** Status bo'yicha zaxira matn — server matn bermagan (yoki bermaydigan) holat. */
const FALLBACK_MESSAGE = {
  400: 'So‘rovda xatolik bor.',
  401: 'Ruxsat yo‘q.',
  403: 'Bu amalga ruxsat berilmagan.',
  404: 'Topilmadi.',
  409: 'Amalni bajarib bo‘lmadi.',
  429: 'Juda ko‘p so‘rov yuborildi. Birozdan keyin urinib ko‘ring.',
  500: 'Serverda xatolik yuz berdi. Birozdan keyin urinib ko‘ring.',
}

const NETWORK_MESSAGE = 'Serverga ulanib bo‘lmadi. Internet aloqasini tekshiring.'
const TIMEOUT_MESSAGE = 'Server javob bermadi. Birozdan keyin urinib ko‘ring.'

export class ApiError extends Error {
  /**
   * @param {string} message  — foydalanuvchiga ko'rsatiladigan matn
   * @param {object} [details]
   */
  constructor(message, details = {}) {
    super(message)
    this.name = 'ApiError'
    /** HTTP status. Tarmoq uzilganda 0 — javob umuman kelmagan. */
    this.statusCode = details.statusCode ?? 0
    /** Serverdagi status nomi: "Not Found", "Conflict" … */
    this.error = details.error ?? null
    /** Validatsiya xabarlari ro'yxati (bittasi bo'lsa ham massiv). */
    this.messages = details.messages?.length ? details.messages : [message]
    this.path = details.path ?? null
    /** Shikoyat qilinganda server logidan aynan shu so'rov topiladi. */
    this.requestId = details.requestId ?? null
    /** 'http' | 'network' — kelib chiqishi. */
    this.kind = details.kind ?? 'http'
    if (details.cause) this.cause = details.cause
  }

  /** Javob umuman kelmadi (offline, DNS, CORS, server o'chiq). */
  get isNetwork() {
    return this.kind === 'network'
  }

  /** 404 — yoki yo'q, yoki begonaniki. Ikkalasi ataylab farqlanmaydi. */
  get isNotFound() {
    return this.statusCode === 404
  }

  /** Qayta urinish ma'noga egami (tarmoq yoki server tomoni xatosi). */
  get isRetryable() {
    return this.isNetwork || this.statusCode >= 500
  }

  /** Javob keldi, lekin xato status bilan. */
  static fromResponse(response, body) {
    const raw = body?.message
    const messages = Array.isArray(raw) ? raw.filter(Boolean).map(String) : raw ? [String(raw)] : []
    const status = body?.statusCode ?? response.status
    const message = messages[0] ?? FALLBACK_MESSAGE[status] ?? `So‘rov bajarilmadi (${status}).`

    return new ApiError(message, {
      statusCode: status,
      error: body?.error ?? response.statusText ?? null,
      messages,
      path: body?.path ?? null,
      requestId: body?.requestId ?? response.headers?.get?.('X-Request-Id') ?? null,
    })
  }

  /** Javob KELMADI — `fetch` ning o'zi yiqildi. */
  static network(cause) {
    return new ApiError(NETWORK_MESSAGE, { statusCode: 0, kind: 'network', cause })
  }

  /** Belgilangan vaqt ichida javob kelmadi (`REQUEST_TIMEOUT_MS`). */
  static timeout(cause) {
    return new ApiError(TIMEOUT_MESSAGE, { statusCode: 0, kind: 'network', cause })
  }
}

/** Har qanday tashlangan qiymatni `ApiError` ga keltiradi. */
export function toApiError(value) {
  if (value instanceof ApiError) return value
  return ApiError.network(value)
}
