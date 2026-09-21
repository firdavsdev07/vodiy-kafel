/**
 * Vitest muhitini brauzerga biroz yaqinlashtiradi (S-041).
 *
 * jsdom — to'liq brauzer emas: quyidagilar unda UMUMAN yo'q va
 * kod ularga tegsa test "TypeError" bilan yiqiladi. Shuning uchun
 * eng zarurlari shu yerda qo'yiladi.
 *
 * ⚠ Bu taqlid, o'lchov EMAS. `matchMedia` bu yerda doim "mos
 *   kelmadi" deydi — ya'ni testlar TO'LIQ HARAKAT rejimida ishlaydi.
 *   `prefers-reduced-motion` ni sinash uchun test uni o'zi
 *   almashtiradi (`tests/motion.test.js` ga qarang).
 */

// `window.matchMedia` — `useMediaQuery`, `prefersReducedMotion` va
// Lenis shuni so'raydi.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })
}

// `IntersectionObserver` — `SmartImage` va GSAP yuklagichi ishlatadi.
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}

// `ResizeObserver` — Lenis va ScrollTrigger.
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom `scrollTo` ni amalga oshirmagan va konsolga "Not implemented"
// deb yozadi — test chiqishini keraksiz shovqin bilan to'ldiradi.
window.scrollTo = () => {}
