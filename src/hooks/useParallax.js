import { useEffect, useLayoutEffect, useRef } from 'react'

import { ScrollTrigger, gsap, prefersReducedMotion } from '@/animations/gsap'

/** Scroll-linked vertical drift. `amount` is in pixels across the section. */
export function useParallax(amount = 90) {
  const ref = useRef(null)
  const ctxRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { yPercent: -amount / 20 },
        {
          yPercent: amount / 20,
          ease: 'none',
          scrollTrigger: {
            trigger: el.parentElement ?? el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        },
      )
    }, el)

    ctxRef.current = ctx
    ScrollTrigger.refresh()
  }, [amount])

  // Cleanup in useLayoutEffect so GSAP reverts before React removes DOM
  useLayoutEffect(() => {
    return () => {
      ctxRef.current?.revert()
      ctxRef.current = null
    }
  }, [])

  return ref
}

export default useParallax
