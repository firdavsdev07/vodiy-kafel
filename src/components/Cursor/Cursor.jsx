import { useEffect, useRef } from 'react'

import { gsap } from '@/animations/gsap'
import { useIsTouch } from '@/hooks/useMediaQuery'

/**
 * Smooth custom cursor with SVG icons for interactive hints.
 *
 * Any element can declare:  data-cursor="Ko'rish" | "Ochish" | ""
 * - "Ko'rish" → eye icon
 * - "Ochish"  → arrow icon
 * - ""        → slightly enlarged ring, no icon
 */

/* Inline SVG icons — tiny, sharp, no extra network requests */
const ICONS = {
  "Ko'rish": `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
  "Ochish": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>`,
}

export default function Cursor() {
  const isTouch = useIsTouch()
  const dotRef = useRef(null)
  const ringRef = useRef(null)
  const iconRef = useRef(null)

  useEffect(() => {
    if (isTouch) return

    const dot = dotRef.current
    const ring = ringRef.current
    const icon = iconRef.current
    if (!dot || !ring || !icon) return

    const root = document.documentElement
    root.dataset.cursor = 'on'

    // Dot — fast, nearly instant
    const dotXTo = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power2.out' })
    const dotYTo = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power2.out' })

    // Ring — smooth trailing lag
    const ringXTo = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' })
    const ringYTo = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' })

    let visible = false
    let activeLabel = null
    let pressed = false

    const onMove = (e) => {
      dotXTo(e.clientX)
      dotYTo(e.clientY)
      ringXTo(e.clientX)
      ringYTo(e.clientY)
      if (!visible) {
        visible = true
        gsap.to([dot, ring], { autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
      }
    }

    const onLeave = () => {
      visible = false
      gsap.to([dot, ring], { autoAlpha: 0, duration: 0.25 })
    }

    const onOver = (e) => {
      const target = e.target instanceof Element ? e.target : null
      const holder = target?.closest('[data-cursor]')
      const next = holder ? holder.getAttribute('data-cursor') : null

      if (next === activeLabel) return
      activeLabel = next

      if (next === null) {
        // Default — small ring, visible dot, no icon
        gsap.to(ring, {
          scale: 1,
          borderColor: 'rgba(113,104,94,0.18)',
          backgroundColor: 'transparent',
          duration: 0.45,
          ease: 'expo.out',
        })
        gsap.to(dot, { scale: 1, autoAlpha: 1, duration: 0.3 })
        gsap.to(icon, { autoAlpha: 0, scale: 0.5, duration: 0.2 })
        return
      }

      // Show icon if available, otherwise just enlarge slightly
      const svg = ICONS[next]
      if (svg) {
        icon.innerHTML = svg
      } else {
        icon.innerHTML = ''
      }

      gsap.to(ring, {
        scale: next ? 1.6 : 1.3,
        borderColor: next ? 'rgba(11,11,10,0.08)' : 'rgba(113,104,94,0.18)',
        backgroundColor: next ? 'rgba(11,11,10,0.75)' : 'transparent',
        duration: 0.45,
        ease: 'expo.out',
      })
      gsap.to(dot, { scale: 0, autoAlpha: 0, duration: 0.2 })
      gsap.to(icon, {
        autoAlpha: svg ? 1 : 0,
        scale: 1,
        duration: 0.3,
        delay: 0.04,
      })
    }

    const onDown = () => {
      pressed = true
      gsap.to(dot, { scale: 0.5, duration: 0.15, ease: 'power3.out' })
      gsap.to(ring, { scale: activeLabel != null ? 1.35 : 0.8, duration: 0.18, ease: 'power3.out' })
    }

    const onUp = () => {
      if (!pressed) return
      pressed = false
      gsap.to(dot, {
        scale: activeLabel != null ? 0 : 1,
        duration: 0.3,
        ease: 'power3.out',
      })
      gsap.to(ring, {
        scale: activeLabel != null ? 1.6 : 1,
        duration: 0.4,
        ease: 'power3.out',
      })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    return () => {
      delete root.dataset.cursor
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('mouseleave', onLeave)
      gsap.killTweensOf([dot, ring, icon])
    }
  }, [isTouch])

  if (isTouch) return null

  return (
    <>
      {/* Outer ring */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full opacity-0"
        style={{
          width: 36,
          height: 36,
          marginLeft: -18,
          marginTop: -18,
          border: '1.2px solid rgba(113,104,94,0.18)',
          willChange: 'transform',
        }}
      >
        {/* Icon container */}
        <span
          ref={iconRef}
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center text-bone opacity-0"
          style={{ willChange: 'transform, opacity' }}
        />
      </div>

      {/* Inner dot */}
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full opacity-0"
        style={{
          width: 7,
          height: 7,
          marginLeft: -3.5,
          marginTop: -3.5,
          background: '#71685e',
          willChange: 'transform',
        }}
      />
    </>
  )
}
