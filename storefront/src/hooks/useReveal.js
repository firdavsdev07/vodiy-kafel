import { useEffect, useLayoutEffect, useRef } from 'react'

import { EASE, ScrollTrigger, gsap, prefersReducedMotion } from '@/animations/gsap'

/**
 * Scroll-triggered reveal for a section.
 *
 * Children opt in with a class:
 *   .r-line — masked line, rises from 110%
 *   .r-fade — fades and lifts
 *   .r-clip — clip-path wipe (frame opens)
 *   .r-zoom — counter-scale, use on the <img> inside a .r-clip frame
 *
 * CSS holds the same initial state so nothing flashes before JS runs.
 */
export function useReveal({ start = 'top 82%', stagger = 0.075, delay = 0 } = {}) {
  const ref = useRef(null)
  const ctxRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (prefersReducedMotion()) {
      el.setAttribute('data-reveal', 'in')
      return
    }

    const lines = el.querySelectorAll('.r-line')
    const fades = el.querySelectorAll('.r-fade')
    const clips = el.querySelectorAll('.r-clip')
    const zooms = el.querySelectorAll('.r-zoom')

    // Bail out if there's nothing to animate
    if (!lines.length && !fades.length && !clips.length && !zooms.length) {
      el.setAttribute('data-reveal', 'in')
      return
    }

    const ctx = gsap.context(() => {
      // Only set initial state on non-empty collections
      if (lines.length) gsap.set(lines, { y: 0, yPercent: 110 })
      if (fades.length) gsap.set(fades, { autoAlpha: 0, y: 20 })
      if (clips.length) gsap.set(clips, { clipPath: 'inset(0% 0% 100% 0%)' })
      if (zooms.length) gsap.set(zooms, { scale: 1.14 })

      const tl = gsap.timeline({
        defaults: { ease: EASE },
        delay,
        scrollTrigger: { trigger: el, start, once: true },
        onComplete: () => el.setAttribute('data-reveal', 'in'),
      })

      if (clips.length) {
        tl.to(clips, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, stagger: 0.12 }, 0)
      }
      if (zooms.length) {
        tl.to(zooms, { scale: 1, duration: 1.8, stagger: 0.12 }, 0)
      }
      if (lines.length) {
        tl.to(lines, { y: 0, yPercent: 0, duration: 1.25, stagger }, clips.length ? 0.15 : 0)
      }
      if (fades.length) {
        tl.to(
          fades,
          { autoAlpha: 1, y: 0, duration: 1.1, stagger: stagger * 0.8 },
          lines.length ? 0.25 : 0,
        )
      }
    }, el)

    ctxRef.current = ctx
    ScrollTrigger.refresh()
  }, [start, stagger, delay])

  // Cleanup in useLayoutEffect so GSAP reverts BEFORE React removes DOM nodes
  useLayoutEffect(() => {
    return () => {
      ctxRef.current?.revert()
      ctxRef.current = null
    }
  }, [])

  return ref
}

export default useReveal
