import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { gsapLoaded, loadGsapNear } from '@/animations/gsap'
import PageHeader from '@/components/ui/PageHeader'
import SmartImage from '@/components/ui/SmartImage'
import { categories } from '@/data/categories'
import { countByCategory } from '@/data/products'
import { useIsTouch } from '@/hooks/useMediaQuery'
import { useReveal } from '@/hooks/useReveal'
import { playTone } from '@/lib/sound'
import Seo from '@/components/ui/Seo'

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

    let detach = null

    // Kursor ortidan yuradigan rasm — sof bezak, shuning uchun GSAP
    // ro'yxat ekranga yaqinlashganda so'raladi (S-018).
    const cancel = loadGsapNear(list, ({ gsap }) => {

      const xTo = gsap.quickTo(preview, 'x', { duration: 0.85, ease: 'power3' })
      const yTo = gsap.quickTo(preview, 'y', { duration: 0.85, ease: 'power3' })

      const onMove = (e) => {
        const rect = list.getBoundingClientRect()
        xTo(e.clientX - rect.left)
        yTo(e.clientY - rect.top)
      }

      // `will-change` faqat sichqoncha ro'yxat ustida bo'lganda (S-018)
      const onEnter = () => preview.classList.add('is-animating')
      const onLeave = () => preview.classList.remove('is-animating')

      list.addEventListener('pointermove', onMove)
      list.addEventListener('pointerenter', onEnter)
      list.addEventListener('pointerleave', onLeave)

      detach = () => {
        list.removeEventListener('pointermove', onMove)
        list.removeEventListener('pointerenter', onEnter)
        list.removeEventListener('pointerleave', onLeave)
        gsap.killTweensOf(preview)
      }
    })

    return () => {
      cancel()
      detach?.()
    }
  }, [isTouch])

  useEffect(() => {
    const preview = previewRef.current
    if (!preview || isTouch) return
    // Sichqoncha ro'yxatga kirgan bo'lsa GSAP allaqachon yuklangan;
    // kirmagan bo'lsa yashirish uchun animatsiyaning keragi yo'q.
    const gsap = gsapLoaded()?.gsap
    if (!gsap) return
    gsap.to(preview, {
      autoAlpha: hovered === null ? 0 : 1,
      scale: hovered === null ? 0.92 : 1,
      duration: 0.7,
      ease: 'expo.out',
    })
  }, [hovered, isTouch])

  return (
    <>
      <Seo
        title="Kategoriyalar"
        description="Yuza turlari bo‘yicha katalog: pol, devor, marmar effekt, tosh effekt va boshqalar."
      />

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
                  className="group flex items-center gap-5 py-[clamp(1.25rem,3vw,2.4rem)] md:gap-10"
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
                    {/* Faqat sarlavha xiralashadi — kichik matnlar (index,
                        tagline, nameEn) o'zgarmas: `clay` rangi o'zi ham
                        AA chegarasiga yaqin (4.62:1), xiralashtirilsa
                        pastga tushib ketardi (S-006). */}
                    <span
                      className="type-sub block transition-[opacity,transform] duration-500 ease-[cubic-bezier(.16,1,.3,1)] md:group-hover:translate-x-3"
                      style={{
                        opacity: hovered === null || hovered === i || isTouch ? 1 : 0.5,
                      }}
                    >
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
