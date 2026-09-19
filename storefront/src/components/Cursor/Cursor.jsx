import { useEffect, useRef } from 'react'

import { useIsTouch } from '@/hooks/useMediaQuery'
import { allowHeavyMotion } from '@/lib/motion'

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
 *
 * S-020: `prefers-reduced-motion` da va zaif qurilmada halqa UMUMAN
 * chizilmaydi — nativ kursorning o'zi qoladi. Avval reduced motion'da
 * halqa qolib, faqat `transition` 0.01ms ga tushardi, ya'ni kursor
 * ortidan sakrab yuradigan ikkinchi nuqta bo'lib ko'rinardi.
 */
export default function Cursor() {
  const isTouch = useIsTouch()
  const ringRef = useRef(null)
  const heavy = allowHeavyMotion()

  useEffect(() => {
    if (isTouch || !heavy) return

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

    /* `will-change` halqa EKRANDA bo'lgandagina (S-018). Avval u CSS'da
       doimiy edi: sichqoncha hech qachon tegmagan sahifada ham (masalan
       telefonga ulangan tashqi ekranda yoki odam boshqa oynada ishlayotgan
       paytda) kompozitor qatlami yaratilib, xotirada turardi. */
    const onMove = (e) => {
      ring.style.translate = `${e.clientX}px ${e.clientY}px`
      if (!visible) {
        visible = true
        ring.style.willChange = 'translate, scale'
        ring.style.opacity = '1'
      }
    }

    const onLeave = () => {
      visible = false
      ring.style.opacity = '0'
      ring.style.willChange = ''
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
  }, [isTouch, heavy])

  if (isTouch || !heavy) return null

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
