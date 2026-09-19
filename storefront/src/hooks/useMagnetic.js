import { useEffect, useRef } from 'react'

import { loadGsapNear } from '@/animations/gsap'
import { allowHeavyMotion } from '@/lib/motion'

/**
 * Magnit tugma (S-019): sichqoncha yaqinlashganda element uning ortidan
 * biroz suriladi, chiqib ketganda joyiga qaytadi.
 *
 * QOIDALAR (G4 — harakat javobni sekinlashtirmaydi):
 *   • hodisalar FAQAT shu elementga ulanadi, `window` ga emas — sichqoncha
 *     tugma ustida bo'lmaganda umuman hisob yo'q
 *   • `quickTo` — har harakatda yangi tween yaratilmaydi, bittasi qayta
 *     ishlatiladi
 *   • `will-change` faqat kursor ustida turganda
 *   • barmoqli qurilmada va `prefers-reduced-motion` da umuman ulanmaydi
 *
 * `strength` — element kursorga qanchalik ergashadi (0 = qimirlamaydi,
 * 1 = kursor ostiga to'liq keladi). 0.3 atrofi "tortilyapti" degan hissni
 * beradi, lekin bosish nuqtasini joyidan uzoqlashtirmaydi.
 */
export function useMagnetic({ strength = 0.3, max = 14 } = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !allowHeavyMotion()) return
    // Barmoqda "yaqinlashish" degan tushuncha yo'q — hover ham yo'q
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return

    let detach = null

    const cancel = loadGsapNear(el, ({ gsap }) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' })
      const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' })

      const onMove = (e) => {
        const r = el.getBoundingClientRect()
        const dx = (e.clientX - (r.left + r.width / 2)) * strength
        const dy = (e.clientY - (r.top + r.height / 2)) * strength
        xTo(Math.max(-max, Math.min(max, dx)))
        yTo(Math.max(-max, Math.min(max, dy)))
      }

      const onEnter = () => el.classList.add('is-animating')
      const onLeave = () => {
        el.classList.remove('is-animating')
        xTo(0)
        yTo(0)
      }

      el.addEventListener('pointerenter', onEnter)
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerleave', onLeave)

      detach = () => {
        el.removeEventListener('pointerenter', onEnter)
        el.removeEventListener('pointermove', onMove)
        el.removeEventListener('pointerleave', onLeave)
        gsap.killTweensOf(el)
        gsap.set(el, { x: 0, y: 0 })
      }
    })

    return () => {
      cancel()
      detach?.()
    }
  }, [strength, max])

  return ref
}

export default useMagnetic
