import { useRef, useState } from 'react'

import SmartImage from '@/components/ui/SmartImage'

/**
 * 360° aylantirgich (S-023).
 *
 * Backend `IMAGE_360` ni KADRLAR ro'yxati qilib beradi — har bir kadr
 * alohida surat (`api/src/modules/products/product-media.service.ts`).
 * Shu komponent ularni bitta yuzaga yig'adi: odam sudrasa (yoki
 * klaviaturada o'q bossa) kadr almashadi.
 *
 * ⚠ O'ZI AYLANMAYDI. Avtomatik aylanish — to'xtovsiz harakat, ya'ni
 *   `prefers-reduced-motion` ni buzardi (S-020) va sahifaning sokin
 *   ohangiga ham to'g'ri kelmaydi. Harakatni odam boshqaradi.
 */

/** Shuncha piksel sudralganda bitta kadr o'tadi. */
const STEP_PX = 14

/** Manfiy qoldiqsiz halqa: -1 → oxirgi kadr. */
const wrap = (value, length) => ((value % length) + length) % length

export default function Product360({ frames, alt, ratio = '4 / 3', className = '' }) {
  const [index, setIndex] = useState(0)
  const drag = useRef(null)

  // Bitta kadr — aylantiradigan narsa yo'q, oddiy surat.
  if (frames.length < 2) {
    return <SmartImage src={frames[0]?.src} alt={alt} ratio={ratio} className={className} />
  }

  const step = (delta) => setIndex((current) => wrap(current + delta, frames.length))

  const onPointerDown = (event) => {
    drag.current = { x: event.clientX, index }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event) => {
    if (!drag.current) return
    const moved = Math.round((event.clientX - drag.current.x) / STEP_PX)
    // Chapga sudrash — oldinga aylantiradi (yuza qo'l ostida burilgandek).
    setIndex(wrap(drag.current.index - moved, frames.length))
  }

  const onPointerUp = (event) => {
    drag.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  return (
    <div className={className}>
      {/* Sudrash gorizontal — `touch-pan-y` telefonda sahifani vertikal
          aylantirishni qoldiradi, lekin gorizontal harakatni brauzerdan
          olib, shu yerga beradi. */}
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${alt} — 360° ko‘rinish`}
        aria-valuemin={1}
        aria-valuemax={frames.length}
        aria-valuenow={index + 1}
        aria-valuetext={`${index + 1} / ${frames.length} kadr`}
        className="relative w-full cursor-ew-resize touch-pan-y select-none overflow-hidden bg-stone outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
        style={{ aspectRatio: ratio }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') step(1)
          else if (event.key === 'ArrowLeft') step(-1)
          else return
          event.preventDefault()
        }}
      >
        {/* Hamma kadr DOM'da turadi va faqat ko'rinishi almashadi.
            `SmartImage` bu yerda ishlamaydi: u har bir yangi manbani
            noldan "yuklanmoqda" deb boshlaydi, ya'ni sudrash paytida
            kadrlar o'chib-yonardi. Bu yerda esa kadr allaqachon
            yuklangan — almashuv bir zumda. */}
        {frames.map((frame, i) => (
          <img
            key={frame.id ?? frame.src}
            src={frame.src}
            alt={i === index ? alt : ''}
            aria-hidden={i === index ? undefined : 'true'}
            // Birinchi kadr darhol, qolganlari brauzer navbatida:
            // 360° blok sahifaning pastida turadi.
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            draggable="false"
            className={`absolute inset-0 h-full w-full object-cover ${i === index ? '' : 'invisible'}`}
          />
        ))}
      </div>

      <div className="mt-3 flex items-baseline justify-between type-label text-clay">
        <span>360° — sudrab aylantiring</span>
        <span>
          {String(index + 1).padStart(2, '0')} / {String(frames.length).padStart(2, '0')}
        </span>
      </div>
    </div>
  )
}
