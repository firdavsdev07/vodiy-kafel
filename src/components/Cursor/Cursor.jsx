import { useEffect, useRef } from 'react'

import { gsap } from '@/animations/gsap'
import { useIsTouch } from '@/hooks/useMediaQuery'

/**
 * Minimal smooth cursor — border ring + center dot.
 *
 * The dot tracks the pointer tightly, the ring trails behind with
 * a soft delay creating a fluid, satisfying motion.
 *
 * data-cursor="" or data-cursor="..." on any element enlarges the ring.
 */
export default function Cursor() {
  const isTouch = useIsTouch()
  const dotRef = useRef(null)
  const ringRef = useRef(null)

  useEffect(() => {
    if (isTouch) return

    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    const root = document.documentElement
    root.dataset.cursor = 'on'

    // Dot — tight tracking
    const dotXTo = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'none' })
    const dotYTo = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'none' })

    // Ring — smooth trailing lag
    const ringXTo = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3.out' })
    const ringYTo = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3.out' })

    let visible = false
    let hovered = false
    let pressed = false

    const onMove = (e) => {
      dotXTo(e.clientX)
      dotYTo(e.clientY)
      ringXTo(e.clientX)
      ringYTo(e.clientY)
      if (!visible) {
        visible = true
        gsap.to([dot, ring], { autoAlpha: 1, duration: 0.3 })
      }
    }

    const onLeave = () => {
      visible = false
      gsap.to([dot, ring], { autoAlpha: 0, duration: 0.2 })
    }

    const onOver = (e) => {
      const target = e.target instanceof Element ? e.target : null
      const holder = target?.closest('[data-cursor]')
      const next = holder != null

      if (next === hovered) return
      hovered = next

      if (!hovered) {
        // Default state
        gsap.to(ring, { scale: 1, duration: 0.4, ease: 'expo.out' })
        gsap.to(dot, { scale: 1, duration: 0.3, ease: 'expo.out' })
      } else {
        // Hovered — ring grows, dot shrinks
        gsap.to(ring, { scale: 1.5, duration: 0.4, ease: 'expo.out' })
        gsap.to(dot, { scale: 0.5, duration: 0.3, ease: 'expo.out' })
      }
    }

    const onDown = () => {
      pressed = true
      gsap.to(ring, { scale: hovered ? 1.2 : 0.75, duration: 0.15, ease: 'power3.out' })
      gsap.to(dot, { scale: hovered ? 0.3 : 0.6, duration: 0.12, ease: 'power3.out' })
    }

    const onUp = () => {
      if (!pressed) return
      pressed = false
      gsap.to(ring, { scale: hovered ? 1.5 : 1, duration: 0.4, ease: 'power3.out' })
      gsap.to(dot, { scale: hovered ? 0.5 : 1, duration: 0.3, ease: 'power3.out' })
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
      gsap.killTweensOf([dot, ring])
    }
  }, [isTouch])

  if (isTouch) return null

  return (
    <>
      {/* Ring — border circle */}
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full opacity-0"
        style={{
          width: 36,
          height: 36,
          marginLeft: -18,
          marginTop: -18,
          border: '1.5px solid rgba(113,104,94,0.35)',
          willChange: 'transform',
        }}
      />

      {/* Dot — center point */}
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-full opacity-0"
        style={{
          width: 10,
          height: 10,
          marginLeft: -5,
          marginTop: -5,
          backgroundColor: '#71685e',
          willChange: 'transform',
        }}
      />
    </>
  )
}
