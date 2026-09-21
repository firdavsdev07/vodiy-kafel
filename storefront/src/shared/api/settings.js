import { useApiQuery } from './useApiQuery.js'

/**
 * Ochiq sozlamalar — `GET /settings/public` (S-028).
 *
 * Bu yerga admin `isPublic` deb BELGILAGAN kalitlargina chiqadi, ya'ni
 * "saytda ko'rsatilsinmi?" degan savolga admin panelining o'zi javob
 * beradi. Sayt shunchaki bor narsani ko'rsatadi va yo'q bo'lsa jim
 * turadi — kalitni kod ichida qattiq yoqib/o'chirib o'tirmaydi.
 *
 * Javob — `[{ key, value }]` ro'yxati. Qiymat turi kalitga bog'liq.
 */

export function usePublicSettings() {
  return useApiQuery('/settings/public')
}

/** Ro'yxatdan bitta kalitni topadi. Yo'q bo'lsa — `undefined`. */
export function findSetting(settings, key) {
  return (settings ?? []).find((item) => item.key === key)?.value ?? undefined
}

/**
 * Bank rekvizitlari (`payment.requisites`).
 *
 * Ochiq saytda savat ham, to'lov ham yo'q (G1) — bu ma'lumot pul
 * ko'chirish orqali ishlaydigan (ko'pincha optom) mijoz uchun kerak.
 * Qiymat `null` bo'lishi mumkin: admin kalitni ochgan, lekin hali
 * to'ldirmagan. O'shanda ham blok chiqmaydi.
 */
export function usePaymentRequisites() {
  const { data, ...rest } = usePublicSettings()
  const value = findSetting(data, 'payment.requisites')
  return { ...rest, data: value && value.account ? value : undefined }
}
