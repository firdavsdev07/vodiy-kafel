import { ScrollTrigger, gsap, prefersReducedMotion } from '@/animations/gsap'

let lenis = null
let rafHandler = null
/** `initLenis` chaqirilgan, lekin `destroyLenis` undan OLDIN kelgan holat. */
let wanted = false

/**
 * Smooth scroll, wired into the GSAP ticker so ScrollTrigger stays in sync.
 *
 * Lenis DINAMIK yuklanadi (S-002): u — sof yaxshilanish, sahifa usiz ham
 * to'liq ishlaydi (brauzerning o'z scroll'i). Shuning uchun uni birinchi
 * ekran yukiga qo'shishning ma'nosi yo'q. Quyidagi barcha funksiyalar
 * `lenis` hali `null` bo'lgan oraliqni allaqachon hisobga oladi.
 */
export function initLenis() {
  if (lenis || prefersReducedMotion()) return
  wanted = true

  void import('lenis').then(({ default: Lenis }) => {
    // Yuklanguncha `destroyLenis` chaqirilgan bo'lsa — mount qilinmaydi
    if (!wanted || lenis) return

    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.4,
    })

    lenis.on('scroll', ScrollTrigger.update)

    rafHandler = (time) => lenis?.raf(time * 1000)
    gsap.ticker.add(rafHandler)
    gsap.ticker.lagSmoothing(0)

    // Yuklanish paytida menyu/darvoza scroll'ni qulflagan bo'lishi mumkin
    if (document.documentElement.classList.contains('lenis-stopped')) lenis.stop()
  })
}

export function destroyLenis() {
  wanted = false
  if (rafHandler) gsap.ticker.remove(rafHandler)
  lenis?.destroy()
  lenis = null
  rafHandler = null
}

export const getLenis = () => lenis

export function stopScroll() {
  lenis?.stop()
  document.documentElement.classList.add('lenis-stopped')
  document.body.style.overflow = 'hidden'
}

export function startScroll() {
  lenis?.start()
  document.documentElement.classList.remove('lenis-stopped')
  document.body.style.overflow = ''
}

export function scrollToTop(immediate = true) {
  if (lenis) lenis.scrollTo(0, { immediate })
  else window.scrollTo(0, 0)
}

export function scrollTo(target, options = {}) {
  if (lenis) lenis.scrollTo(target, { duration: 1.4, ...options })
  else if (typeof target !== 'number') {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' })
  }
}
