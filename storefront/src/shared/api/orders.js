import { apiGet } from './client.js'

/**
 * Buyurtmani kuzatish — `GET /orders/{orderNumber}/track` (S-029).
 *
 * Hisobsiz ishlaydi, lekin ochiq-oydin emas: buyurtma raqami YETARLI
 * EMAS, egasining telefoni ham kerak. Telefon mos kelmasa javob
 * "topilmadi" bilan BIR XIL — ya'ni raqamlarni birma-bir sinab
 * ko'rgan odam hech narsa bilib ololmaydi.
 *
 * 🔒 Javobda faqat holat va vaqtlar bor: summa, mahsulotlar, mijoz
 *    ma'lumoti YO'Q.
 *
 * `useApiQuery` ishlatilmaydi — bu sahifa ochilganda emas, odam
 * FORMANI YUBORGANDA bajariladigan amal. Keshda saqlanishi ham
 * kerak emas: telefon raqami kalitning (URL) ichida qolardi.
 */

/** `OrderStatus` (`api/docs/enums.md`). */
export const ORDER_STATUS_LABEL = {
  NEW: 'Buyurtma qabul qilindi',
  SEARCHING_TRANSPORT: 'Mashina qidirilmoqda',
  LOADING: 'Yuklash jarayonida',
  DELIVERING: 'Yetkazib berilmoqda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
}

/** Yakuniy holatlar — ulardan chiqish yo'q. */
export const FINAL_STATUSES = ['DELIVERED', 'CANCELLED']

export function trackOrder(orderNumber, phone, options) {
  const number = String(orderNumber ?? '').trim()
  // Bo'sh joy, qavs va tire serverga kerak emas — u o'zi tozalaydi,
  // lekin URL'ni ham keraksiz belgilar bilan to'ldirmaymiz.
  const cleanPhone = String(phone ?? '').replace(/[^\d+]/g, '')
  return apiGet(`/orders/${encodeURIComponent(number)}/track`, {
    ...options,
    params: { phone: cleanPhone },
  })
}

/**
 * Tarixni ko'rsatishga tayyor holga keltiradi: eng yangisi TEPADA.
 * Server tartibiga ishonilmaydi — u o'zgarishi mumkin.
 */
export function trackModel(dto) {
  const history = [...(dto.statusHistory ?? [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  )
  return {
    orderNumber: dto.orderNumber,
    status: dto.status,
    statusLabel: ORDER_STATUS_LABEL[dto.status] ?? dto.status,
    isFinal: FINAL_STATUSES.includes(dto.status),
    isCancelled: dto.status === 'CANCELLED',
    // Olib ketishda `null` — yetkazib berish manzili yo'q degani.
    regionName: dto.regionName ?? null,
    createdAt: dto.createdAt,
    history: history.map((entry) => ({
      status: entry.status,
      label: ORDER_STATUS_LABEL[entry.status] ?? entry.status,
      createdAt: entry.createdAt,
    })),
  }
}

/** `2026-09-17T20:55:43Z` → `17.09.2026, 20:55`. */
export function formatDateTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
