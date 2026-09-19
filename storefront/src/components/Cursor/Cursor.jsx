import { useEffect, useRef } from 'react'

import { useIsTouch } from '@/hooks/useMediaQuery'

/**
 * Trailing accent ring — the native cursor does the actual pointing.
 *
 * S-016: the old version hid the OS cursor and drew a dot in its place,
 * animated through GSAP `quickTo` (0.1s ease) — meaning the only cursor
 * the visitor could see was always ~100ms behind their hand. No amount of
 * tuning fixes that; the native cursor is the one pointer position that
 * is never late. So it stays on, and this ring is purely a decorative
 * trail that grows over `[data-cursor]` targets — CSS `transition` on the
 * standalone `translate`/`scale` properties, no per-frame JS and no GSAP
 * in this component at all (`.cursor-ring` in index.css).
 */
export default function Cursor() {
  const isTouch = useIsTouch()
  const ringRef = useRef(null)

  useEffect(() => {
    if (isTouch) return

    const ring = ringRef.current
    if (!ring) return

    let visible = false
    let hovered = false
    let pressed = false

    // `pointerover` fires once per element boundary the pointer crosses,
    // so hovering into a card re-walks `closest()` for every nested child
    // (image, heading, meta row, ...) it passes through. Cache the answer
    // per element instead of re-walking the tree each time.
    const targetCache = new WeakMap()
    const isCursorTarget = (el) => {
      let result = targetCache.get(el)
      if (result === undefined) {
        result = el.closest('[data-cursor]') != null
        targetCache.set(el, result)
      }
      return result
    }

    const applyScale = () => {
      ring.style.scale = hovered ? (pressed ? '1.2' : '1.5') : pressed ? '0.75' : '1'
    }

    const onMove = (e) => {
      ring.style.translate = `${e.clientX}px ${e.clientY}px`
      if (!visible) {
        visible = true
        ring.style.opacity = '1'
      }
    }

    const onLeave = () => {
      visible = false
      ring.style.opacity = '0'
    }

    const onOver = (e) => {
      const target = e.target instanceof Element ? e.target : null
      const next = target ? isCursorTarget(target) : false
      if (next === hovered) return
      hovered = next
      applyScale()
    }

    const onDown = () => {
      pressed = true
      applyScale()
    }

    const onUp = () => {
      if (!pressed) return
      pressed = false
      applyScale()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerover', onOver, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [isTouch])

  if (isTouch) return null

  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      className="cursor-ring pointer-events-none fixed left-0 top-0 z-[9999] rounded-full opacity-0"
      style={{
        width: 36,
        height: 36,
        marginLeft: -18,
        marginTop: -18,
        border: '1.5px solid rgba(113,104,94,0.35)',
      }}
    />
  )
}
