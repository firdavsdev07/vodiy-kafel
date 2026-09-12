import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { gsap } from '@/animations/gsap'
import PageHeader from '@/components/ui/PageHeader'
import SmartImage from '@/components/ui/SmartImage'
import { categories } from '@/data/categories'
import { countByCategory } from '@/data/products'
import { useIsTouch } from '@/hooks/useMediaQuery'
import { useReveal } from '@/hooks/useReveal'
import { playTone } from '@/lib/sound'

/** The index. A cursor-tracked still answers whichever row is being read. */
export default function Categories() {
  const listRef = useRef(null)
  const previewRef = useRef(null)
  const [hovered, setHovered] = useState(null)
  const isTouch = useIsTouch()
  const revealRef = useReveal({ start: 'top 85%', stagger: 0.06 })

  useEffect(() => {
    const list = listRef.current
    const preview = previewRef.current
    if (!list || !preview || isTouch) return

    const xTo = gsap.quickTo(preview, 'x', { duration: 0.85, ease: 'power3' })
    const yTo = gsap.quickTo(preview, 'y', { duration: 0.85, ease: 'power3' })

    const onMove = (e) => {
      const rect = list.getBoundingClientRect()
      xTo(e.clientX - rect.left)
      yTo(e.clientY - rect.top)
    }

    list.addEventListener('pointermove', onMove)
    return () => {
      list.removeEventListener('pointermove', onMove)
      gsap.killTweensOf(preview)
    }
  }, [isTouch])

  useEffect(() => {
    const preview = previewRef.current
    if (!preview || isTouch) return
    gsap.to(preview, {
      autoAlpha: hovered === null ? 0 : 1,
      scale: hovered === null ? 0.92 : 1,
      duration: 0.7,
      ease: 'expo.out',
    })
  }, [hovered, isTouch])

  return (
    <>
      <PageHeader
        index="03"
        eyebrow="Indeks"
        title={['Kategoriyalar']}
        meta={`${categories.length} toifa`}
        lede="Har bir toifa boshqa vazifa uchun. Pol yuklamaga, devor yorug‘likka, tashqi qoplama sovuqqa hisoblanadi."
      />

      <section
        ref={revealRef}
        data-reveal=""
        className="relative z-10 pb-[clamp(6rem,14vw,12rem)]"
      >
        <div ref={listRef} className="relative edge">
          {/* cursor-tracked preview — desktop only */}
          {!isTouch && (
            <div
              ref={previewRef}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-20 -ml-[13vw] -mt-[17vh] hidden w-[26vw] opacity-0 md:block"
              style={{ willChange: 'transform' }}
            >
              {categories.map((cat, i) => (
                <div
                  key={cat.slug}
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{ opacity: hovered === i ? 1 : 0 }}
                >
                  <SmartImage
                    id={cat.cover}
                    alt=""
                    ratio="3 / 4"
                    sizes="26vw"
                    reveal={false}
                    className="w-full"
                  />
                </div>
              ))}
              {/* spacer to give the absolute stack a height */}
              <div className="w-full" style={{ aspectRatio: '3 / 4' }} />
            </div>
          )}

          <ul
            className="relative z-10 border-t border-charcoal/12"
            onMouseLeave={() => setHovered(null)}
          >
            {categories.map((cat, i) => (
              <li key={cat.slug} className="border-b border-charcoal/12">
                <Link
                  to={`/categories/${cat.slug}`}
                  data-cursor="Ochish"
                  onMouseEnter={() => {
                    setHovered(i)
                    playTone('hover')
                  }}
                  onClick={() => playTone('click')}
                  className="group flex items-center gap-5 py-[clamp(1.25rem,3vw,2.4rem)] transition-opacity duration-500 md:gap-10"
                  style={{
                    opacity: hovered === null || hovered === i || isTouch ? 1 : 0.3,
                  }}
                >
                  <span className="type-label w-7 shrink-0 text-clay">{cat.index}</span>

                  {isTouch && (
                    <SmartImage
                      id={cat.cover}
                      alt=""
                      ratio="1 / 1"
                      sizes="72px"
                      reveal={false}
                      className="w-16 shrink-0"
                    />
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="type-sub block transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] md:group-hover:translate-x-3">
                      {cat.name}
                    </span>
                    <span className="mt-2 block max-w-[42ch] text-clay md:mt-3">
                      {cat.tagline}
                    </span>
                  </span>

                  <span className="hidden shrink-0 text-right md:block">
                    <span className="type-label block text-clay">{cat.nameEn}</span>
                    <span className="mt-2 block type-label">
                      {countByCategory(cat.slug)} mahsulot
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
