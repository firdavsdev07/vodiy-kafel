import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

import { ScrollTrigger, gsap, prefersReducedMotion } from '@/animations/gsap'
import SmartImage from '@/components/ui/SmartImage'
import { categories } from '@/data/categories'
import { countByCategory } from '@/data/products'
import { useIsMobile } from '@/hooks/useMediaQuery'

/**
 * The collection browser — horizontal movement driven by vertical scroll
 * (DESIGN.md §5). Not a card grid: each category owns most of the viewport
 * and is read one at a time.
 *
 * Below the md breakpoint the pin is dropped and the panels stack, because a
 * pinned horizontal rail on a phone fights the user's scroll.
 */
export default function CategoriesSection() {
  const sectionRef = useRef(null)
  const trackRef = useRef(null)
  const progressRef = useRef(null)
  const counterRef = useRef(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track || isMobile || prefersReducedMotion()) return

    const ctx = gsap.context(() => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth)

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.6,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progressRef.current) {
              progressRef.current.style.transform = `scaleX(${self.progress})`
            }
            if (counterRef.current) {
              const i = Math.min(
                categories.length,
                Math.floor(self.progress * categories.length) + 1,
              )
              counterRef.current.textContent = String(i).padStart(2, '0')
            }
          },
        },
      })

      return () => tween.kill()
    }, section)

    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [isMobile])

  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden bg-ink text-bone"
    >
      {/* fixed rail header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-baseline justify-between edge pt-8 md:pt-10">
        <span className="type-label text-clay">02 — Kolleksiyalar</span>
        <span className="type-label text-clay">
          <span ref={counterRef}>01</span> / {String(categories.length).padStart(2, '0')}
        </span>
      </div>

      <div
        ref={trackRef}
        className="flex flex-col gap-16 py-24 md:h-[100svh] md:flex-row md:items-center md:gap-0 md:py-0 md:will-change-transform"
      >
        {/* opening panel */}
        <div className="shrink-0 edge md:flex md:h-full md:w-[52vw] md:flex-col md:justify-center">
          <h2 className="type-head">
            Yuzani
            <br />
            tanlang.
          </h2>
          <p className="mt-8 max-w-[34ch] text-clay">
            Sakkiz toifa — keramogranitdan 20 mm tashqi qoplamagacha. Har biri
            boshqa vazifa uchun ishlab chiqilgan.
          </p>
        </div>

        {categories.map((cat) => (
          <article
            key={cat.slug}
            className="group shrink-0 edge md:h-full md:w-[46vw] md:px-[2vw]"
          >
            <Link
              to={`/categories/${cat.slug}`}
              data-cursor="Ko‘rish"
              className="flex h-full flex-col justify-center"
            >
              <div className="flex items-baseline gap-4">
                <span className="type-label text-clay">{cat.index}</span>
                <span className="type-label text-clay">
                  {countByCategory(cat.slug)} mahsulot
                </span>
              </div>

              <div className="relative mt-5 overflow-hidden">
                <SmartImage
                  id={cat.cover}
                  alt={cat.name}
                  ratio="4 / 5"
                  sizes="(max-width: 767px) 92vw, 46vw"
                  reveal={false}
                  className="w-full"
                  imgClassName="transition-transform duration-[1400ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]"
                />
                <span className="pointer-events-none absolute inset-0 bg-ink/0 transition-colors duration-700 group-hover:bg-ink/15" />
              </div>

              <h3 className="mt-6 type-sub">{cat.name}</h3>
              <p className="mt-3 max-w-[30ch] text-clay">{cat.tagline}</p>
            </Link>
          </article>
        ))}

        {/* closing panel */}
        <div className="shrink-0 edge md:flex md:h-full md:w-[34vw] md:flex-col md:justify-center">
          <Link
            to="/categories"
            data-cursor="Ochish"
            className="group inline-flex flex-col"
          >
            <span className="type-label text-clay">Barchasi</span>
            <span className="mt-3 type-sub">
              Kategoriyalar
              <br />
              indeksi
            </span>
            <span className="mt-8 h-px w-24 bg-bone/40 transition-[width] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:w-44" />
          </Link>
        </div>
      </div>

      {/* rail progress */}
      <div className="absolute inset-x-0 bottom-0 hidden h-px bg-bone/15 md:block">
        <div
          ref={progressRef}
          className="h-full origin-left scale-x-0 bg-bone"
          style={{ willChange: 'transform' }}
        />
      </div>
    </section>
  )
}
