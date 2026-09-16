import Lenis from 'lenis'

import { ScrollTrigger, gsap, prefersReducedMotion } from '@/animations/gsap'

let lenis = null
let rafHandler = null

/** Smooth scroll, wired into the GSAP ticker so ScrollTrigger stays in sync. */
export function initLenis() {
  if (lenis || prefersReducedMotion()) return lenis

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

  return lenis
}

export function destroyLenis() {
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
