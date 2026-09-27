import { apiPost } from './client.js'

/**
 * Aloqa formasi — `POST /leads` (T-013, S-030 dagi "A yo'li").
 *
 * Mehmonning hisobi yo'q (G1): bu buyurtma emas, "menga qo'ng'iroq
 * qiling" iltimosi. Xodim uni admin panelda ko'radi.
 *
 * Spamga qarshi himoya BACKENDDA: IP bo'yicha chegara (429), bot tuzog'i
 * (`website`), takror yuborishda yangi yozuv ochilmaydi. Sayt faqat
 * tuzoq maydonini bo'sh holda uzatadi.
 */

/** Chegaralar — backend `CreateLeadDto` bilan bir xil. */
export const LEAD_LIMITS = { name: 100, message: 2000 }

/**
 * Forma tekshiruvi — backendniki bilan bir xil qoidalar, faqat odam
 * so'rov ketmasidan xatoni ko'rsin uchun. Oxirgi so'z baribir serverda.
 *
 * @returns {Record<string, string>} maydon → xato matni (bo'sh — hammasi joyida)
 */
export function validateLead({ name, phone, message }) {
  const errors = {}
  if (name.trim().length < 2) errors.name = 'Ismingizni kiriting'
  const digits = phone.replace(/\D/g, '').length
  if (digits < 9 || digits > 15 || !/^\+?[\d\s()-]+$/.test(phone.trim())) {
    errors.phone = 'Telefon raqamini to‘liq kiriting'
  }
  if (!message.trim()) errors.message = 'Qisqacha yozing'
  return errors
}

/**
 * Yuboradi. `{ reference }` qaytaradi — mehmon qo'ng'iroq qilganda
 * aytadigan ma'lumotnoma (`VK-…`).
 *
 * @param {{ name: string, phone: string, message: string, branchId?: string, website?: string }} values
 */
export function submitLead({ name, phone, message, branchId, website }) {
  return apiPost('/leads', {
    name: name.trim(),
    phone: phone.trim(),
    message: message.trim(),
    ...(branchId ? { branchId } : null),
    // Tuzoq: odam uni ko'rmaydi va to'ldirmaydi — bo'sh bo'lsa yuborilmaydi.
    ...(website ? { website } : null),
  })
}
