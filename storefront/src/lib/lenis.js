import { gsapLoaded, loadGsap } from '@/animations/gsap'
import { allowHeavyMotion } from '@/lib/motion'

let lenis = null
let rafHandler = null
/** `initLenis` chaqirilgan, lekin `destroyLenis` undan OLDIN kelgan holat. */
let wanted = false
/** Bo'sh vaqtni kutayotgan rejani bekor qilish uchun. */
let cancelSchedule = null

/**
 * Smooth scroll, wired into the GSAP ticker so ScrollTrigger stays in sync.
 *
 * Lenis DINAMIK yuklanadi (S-002): u — sof yaxshilanish, sahifa usiz ham
 * to'liq ishlaydi (brauzerning o'z scroll'i). Shuning uchun uni birinchi
 * ekran yukiga qo'shishning ma'nosi yo'q. Quyidagi barcha funksiyalar
 * `lenis` hali `null` bo'lgan oraliqni allaqachon hisobga oladi.
 *
 * GSAP ham shu yerda, Lenis bilan BIRGA so'raladi (S-018) — Lenis'ning
 * kadr taymeri GSAP ticker'iga ulanadi, shuning uchun ikkalasi birga
 * kerak yoki umuman kerak emas. Ikkalasi ham BIRINCHI EKRAN tugagach
 * so'raladi: brauzer bo'shashini kutamiz, lekin odam undan oldin
 * aylantira boshlasa — darhol yuklaymiz (u paytgacha native scroll
 * ishlaydi, ya'ni kutish sezilmaydi).
 */
export function initLenis() {
  // Silliq scroll har kadrda ishlaydi — zaif qurilmada native scroll
  // har doim tezroq va batareyani kamroq yeydi (S-020)
  if (lenis || wanted || !allowHeavyMotion()) return
  wanted = true
  cancelSchedule = whenIdle(mountLenis)
}

/**
 * Brauzer bo'shaganda yoki odam aylantirmoqchi bo'lganda — qaysi biri
 * oldin kelsa. Qaytaradigan funksiya rejani bekor qiladi.
 */
function whenIdle(run) {
  const events = ['wheel', 'touchstart', 'keydown']
  let done = false

  const fire = () => {
    if (done) return
    done = true
    cleanup()
    run()
  }

  const idleId = window.requestIdleCallback
    ? requestIdleCallback(fire, { timeout: 2000 })
    : setTimeout(fire, 1000)

  const cleanup = () => {
    if (window.requestIdleCallback) cancelIdleCallback(idleId)
    else clearTimeout(idleId)
    for (const type of events) window.removeEventListener(type, fire)
  }

  for (const type of events) window.addEventListener(type, fire, { passive: true, once: true })

  return () => {
    done = true
    cleanup()
  }
}

function mountLenis() {
  void Promise.all([import('lenis'), loadGsap()]).then(([{ default: Lenis }, { gsap, ScrollTrigger }]) => {
    // Yuklanguncha `destroyLenis` chaqirilgan bo'lsa — mount qilinmaydi
    if (!wanted || lenis) return

    lenis = new Lenis({
      // S-017 da o'lchandi. Har bir g'ildirak hodisasi shu davomiylikdagi
      // egri chiziqni QAYTA boshlaydi, shuning uchun tez ketma-ket
      // aylantirganda quyruq cho'ziladi. 1.15s da oxirgi hodisadan keyin
      // ~864ms "suzib" borardi — aynan shu "og'ir" his. 0.9s da ~707ms,
      // bitta tik esa 575ms → 500ms. Bundan pastda (0.7s) harakat
      // "kesilgan" tuyula boshlaydi va DESIGN.md §5 ohangidan chiqadi.
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      // `#intro` (hero'dagi pastga o'q) kabi havolalarni Lenis o'zi
      // boshqaradi. Busiz brauzer bir zumda sakraydi, Lenis esa o'z
      // holatini keyin, native scroll hodisasi orqali tenglaydi —
      // ya'ni silliqlik yo'qoladi. `true` bilan o'q bosilganda sahifa
      // ~670ms da silliq suzib boradi (o'lchandi).
      anchors: true,
      // TELEFONDA LENIS ISHLAMAYDI — ataylab. `syncTouch:false` da
      // barmoq harakati Lenis'ning "native" tarmog'iga tushadi va
      // brauzerning o'z momentum-scroll'i ishlaydi — uni taqlid qilib
      // bo'lmaydi. (`touchMultiplier` shu sababli olib tashlandi:
      // `syncTouch:false` da u hech narsaga ta'sir qilmaydi.)
      syncTouch: false,
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
  cancelSchedule?.()
  cancelSchedule = null
  const gsap = gsapLoaded()?.gsap
  if (rafHandler && gsap) {
    gsap.ticker.remove(rafHandler)
    // `lagSmoothing(0)` global — Lenis ketgach GSAP standartiga qaytariladi
    gsap.ticker.lagSmoothing(500, 33)
  }
  lenis?.destroy()
  lenis = null
  rafHandler = null
}

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
