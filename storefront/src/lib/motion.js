/**
 * HARAKAT BYUDJETI (S-020).
 *
 * Sayt uch darajada ishlaydi:
 *
 *   to'liq  — hamma narsa: Lenis, pin qilingan lenta, parallaks,
 *             magnit tugma, kursor halqasi, reveal'lar
 *   yengil  — HAR KADRDA ishlaydigan narsalar o'chadi (Lenis'ning
 *             rAF halqasi, pin+scrub, parallaks, magnit, kursor
 *             halqasi). Reveal'lar QOLADI: ular `once:true`, ya'ni
 *             bir marta ishlab o'zini o'chiradi va saytning ohangini
 *             ushlab turadi
 *   yo'q    — `prefers-reduced-motion: reduce`: hech qanday harakat
 *             yo'q, GSAP ham, Lenis ham umuman yuklanmaydi
 *
 * "Yengil" ga tushirish mezonlari ATAYLAB QATTIQ tanlangan: noto'g'ri
 * "past quvvatli" deb belgilash oddiy noutbukdan saytning yarmini olib
 * qo'yadi. Shuning uchun chegara — haqiqatan zaif qurilma.
 */

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Batareya — `getBattery()` faqat Chromium'da bor va PROMISE qaytaradi.
 * Shuning uchun natija modul yuklanganda so'raladi va keshlanadi;
 * hammasi undan keyin mount bo'ladi (Lenis bo'sh vaqtda, reveal'lar
 * scroll paytida), ya'ni javob o'z vaqtida yetib keladi.
 *
 * ⚠ Brauzerda "batareya tejash rejimi yoqilgan" degan to'g'ridan-to'g'ri
 *   signal YO'Q — shunday API mavjud emas. Eng yaqin ishonchli belgi:
 *   quvvat past va quvvatlagichga ulanmagan.
 */
let batteryLow = false

if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
  navigator
    .getBattery()
    .then((battery) => {
      const read = () => {
        batteryLow = battery.level <= 0.2 && !battery.charging
      }
      read()
      battery.addEventListener('levelchange', read)
      battery.addEventListener('chargingchange', read)
    })
    .catch(() => {
      /* ruxsat yo'q yoki qo'llab-quvvatlanmaydi — e'tiborsiz qoldiriladi */
    })
}

/** Qurilma haqiqatan zaifmi? */
export function isLowPowerDevice() {
  if (typeof navigator === 'undefined') return false

  // `hardwareConcurrency` — mantiqiy yadrolar. 2 va undan kam = eski
  // telefon yoki eng arzon noutbuk. 4 ni chegara qilish xato bo'lardi:
  // o'rta darajadagi ko'p qurilma aynan 4 yadroli.
  const cores = navigator.hardwareConcurrency
  if (typeof cores === 'number' && cores > 0 && cores <= 2) return true

  // `deviceMemory` — GB, faqat Chromium'da. 2 GB va undan kam.
  const memory = navigator.deviceMemory
  if (typeof memory === 'number' && memory > 0 && memory <= 2) return true

  // Foydalanuvchi "trafikni tejash" ni yoqqan — bu odatda zaif tarmoq
  // va zaif qurilma belgisi, hamda "menga ortiqchasi kerak emas" degani
  if (navigator.connection?.saveData === true) return true

  return batteryLow
}

/** Har kadrda ishlaydigan og'ir effektlar ruxsat etiladimi? */
export function allowHeavyMotion() {
  return !prefersReducedMotion() && !isLowPowerDevice()
}
