import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** See DESIGN.md §5 — slow, controlled, never bouncy. */
export const EASE = 'expo.out'
export const EASE_IN_OUT = 'expo.inOut'

gsap.defaults({ ease: EASE, duration: 1.2 })

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export { gsap, ScrollTrigger }
