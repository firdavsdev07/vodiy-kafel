import { useEffect, useLayoutEffect, useRef } from 'react'

import { loadGsapNear } from '@/animations/gsap'
import { allowHeavyMotion } from '@/lib/motion'

/** Scroll-linked vertical drift. `amount` is in pixels across the section. */
export function useParallax(amount = 90) {
  const ref = useRef(null)
  const ctxRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !allowHeavyMotion()) return

    // Parallaks — sof bezak: GSAP element ekranga yaqinlashganda
    // so'raladi, kelguncha element o'z joyida turadi (S-018).
    const cancel = loadGsapNear(el, ({ gsap, ScrollTrigger }) => {
      if (!ref.current) return

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
              // `will-change` faqat bo'lim ekranda bo'lganda (S-018)
              onToggle: (self) => el.classList.toggle('is-animating', self.isActive),
            },
          },
        )
      }, el)

      ctxRef.current = ctx
      ScrollTrigger.refresh()
    })

    return cancel
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
