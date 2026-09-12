import { useEffect, useRef } from 'react'

import { ScrollTrigger, gsap, prefersReducedMotion } from '@/animations/gsap'

/** Scroll-linked vertical drift. `amount` is in pixels across the section. */
export function useParallax(amount = 90) {
  const ref = useRef(null)

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

    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [amount])

  return ref
}

export default useParallax
