/**
 * GSAP ASINXRON yuklanadi (S-018, S-002 dan ko'chgan talab).
 *
 * Avval bu fayl `gsap` ni modul darajasida import qilardi, shuning uchun
 * `vendor-gsap` (112.8 KB / gzip 44.4 KB) birinchi ekran grafiga kirib
 * qolardi — holbuki sahifa ochilganda GSAP HECH NARSA qilmaydi: reveal'lar
 * ekrandan pastda, menyu yopiq, kursor esa S-016 dan beri sof CSS.
 *
 * Shuning uchun GSAP endi faqat kerak bo'lganda so'raladi. Ikki kirish
 * nuqtasi bor:
 *   `loadGsap()`  — promise; birinchi chaqiruv yuklaydi va sozlaydi
 *   `gsapLoaded()` — sinxron; GSAP hali kelmagan bo'lsa `null`
 *
 * SplitText ham shu yerda ro'yxatdan o'tadi. U avval Club GreenSock
 * obunasini talab qilardi (task.txt shuni yozgan), lekin GSAP 3.13 dan
 * beri — Webflow uni sotib olgach — BARCHA plaginlar bepul, tijorat
 * loyihalari uchun ham. O'rnatilgani: gsap 3.15.0.
 *
 * Harakat byudjeti (kim qanday effektga haqli) bu yerda EMAS —
 * `src/lib/motion.js` da (S-020). Bu fayl faqat GSAP ni yuklaydi.
 *
 * `gsapLoaded()` MUHIM: u "GSAP hozir yo'q" holatini bilib turish imkonini
 * beradi, ya'ni kontentni GSAP ni KUTMASDAN yakuniy holatda ko'rsatish
 * mumkin (FOUC yo'q — S-002 dagi shart).
 */

/** See DESIGN.md §5 — slow, controlled, never bouncy. */
export const EASE = 'expo.out'
export const EASE_IN_OUT = 'expo.inOut'

let loaded = null
let pending = null

export function loadGsap() {
  if (loaded) return Promise.resolve(loaded)
  pending ??= Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
    import('gsap/SplitText'),
  ]).then(
    ([{ gsap }, { ScrollTrigger }, { SplitText }]) => {
      gsap.registerPlugin(ScrollTrigger, SplitText)
      gsap.defaults({ ease: EASE, duration: 1.2 })
      // `limitCallbacks` — onEnter/onLeave kabi chaqiruvlar faqat holat
      // HAQIQATAN o'zgarganda yuboriladi; `ignoreMobileResize` esa
      // telefonda manzil paneli ko'rinib-yo'qolganda `refresh()` ni
      // (ya'ni butun sahifani qayta o'lchashni) to'xtatadi.
      ScrollTrigger.config({ limitCallbacks: true, ignoreMobileResize: true })
      loaded = { gsap, ScrollTrigger, SplitText }

      /* Trigger nuqtalari sahifa BALANDLIGIGA bog'liq, balandlik esa
         shriftlar va o'lchami oldindan ma'lum bo'lmagan rasmlar kelgach
         o'zgaradi. Ikkala holat ham bir martalik: shriftlar tayyor
         bo'lganda va butun sahifa yuklanib bo'lganda qayta o'lchanadi. */
      document.fonts?.ready.then(refreshScrollTriggers)
      if (document.readyState !== 'complete') {
        window.addEventListener('load', refreshScrollTriggers, { once: true })
      }

      return loaded
    },
  )
  return pending
}

/** GSAP hali yuklanmagan bo'lsa — `null`. Hech qachon yuklashni boshlamaydi. */
export const gsapLoaded = () => loaded

/**
 * GSAP ni element EKRANGA YAQINLASHGANDA so'raydi.
 *
 * Reveal'lar, parallaks va pin qilinadigan lenta — hammasi birinchi
 * ekrandan pastda. Ularning effekti mount paytida `loadGsap()` ni
 * chaqirsa, GSAP baribir sahifa ochilishi bilan yuklanardi. Shuning
 * uchun kuzatuv: element ekrandan `margin` qadar naridaligida yuklash
 * boshlanadi — odam u yerga yetguncha GSAP tayyor bo'ladi, umuman
 * aylantirmasa esa yuklanmaydi.
 *
 * Qaytaradigan funksiya kuzatuvni va `onReady` ni bekor qiladi.
 */
export function loadGsapNear(el, onReady, { margin = '500px' } = {}) {
  let live = true

  const start = () => {
    void loadGsap().then((api) => {
      if (live) onReady(api)
    })
  }

  if (typeof IntersectionObserver === 'undefined') {
    start()
    return () => {
      live = false
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      start()
    },
    { rootMargin: `${margin} 0px` },
  )
  io.observe(el)

  return () => {
    live = false
    io.disconnect()
  }
}

/**
 * Rasm yuklangach ScrollTrigger nuqtalarini qayta o'lchash.
 *
 * O'lchami oldindan ma'lum bo'lmagan rasm kelgach sahifa balandligi
 * o'zgaradi va barcha trigger nuqtalari siljiydi. Har bir rasm uchun
 * alohida `refresh()` qilish qimmat (u BARCHA triggerlarni qayta
 * hisoblaydi), shuning uchun chaqiruvlar bitta kadrga yig'iladi.
 */
let refreshQueued = false
export function refreshScrollTriggers() {
  if (refreshQueued) return
  refreshQueued = true
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      refreshQueued = false
      loaded?.ScrollTrigger.refresh()
    })
  })
}
