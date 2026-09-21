import { useEffect, useState } from 'react'

/**
 * Tarmoq uzilganda chiqadigan tasma (S-031).
 *
 * Nega kerak: sayt butunlay API'ga tayanadi (EPIC 5). Internet uzilsa
 * har bir bo'lim alohida "serverga ulanib bo'lmadi" deb qichqirishi —
 * shovqin. Sabab esa bitta, shuning uchun xabar ham bitta bo'lgani
 * ma'qul: yuqorida bitta qator, qolgan sahifa o'z holicha qoladi
 * (keshdagi ma'lumot ko'rinib turaveradi).
 *
 * ⚠ `navigator.onLine` ga TO'LIQ ishonib bo'lmaydi: u faqat "tarmoq
 *   interfeysi bormi" degan savolga javob beradi, "internet ishlayaptimi"
 *   degan savolga emas. Shuning uchun u FAQAT `false` bo'lganda
 *   ishlatiladi — "offline" deyilsa ishonamiz, "online" deyilsa
 *   hech narsa da'vo qilmaymiz. Server o'chiq bo'lgan holatni esa
 *   har bir bo'limning o'z xato holati ko'rsatadi.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    // Boshlang'ich qiymat effekt ichida — server tomonda `navigator` yo'q
    // va birinchi renderda holat mijoznikidan farq qilib ketmasin.
    const sync = () => setOffline(navigator.onLine === false)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      /* `z-[170]` — menyu (150) va Nav (160) dan ham tepada: aloqa
         yo'qligi eng muhim xabar, u hech narsa ostida qolmasin. */
      className="fixed inset-x-0 top-0 z-[170] bg-charcoal px-[5vw] py-3 text-center text-bone"
    >
      <span className="type-label">
        Internet aloqasi yo‘q — ma’lumot yangilanmayapti
      </span>
    </div>
  )
}
