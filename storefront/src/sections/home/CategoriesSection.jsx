import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { loadGsapNear } from '@/animations/gsap'
import { allowHeavyMotion } from '@/lib/motion'
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
 *
 * S-020: ZAIF QURILMADA HAM shunday ustma-ust yotadi. Bu shart: pin
 * bo'lmasa `md:` tartibi (gorizontal, 100svh) lentani `overflow-hidden`
 * ichida qotirib qo'yadi va faqat BIRINCHI panel ko'rinadi — qolgan
 * sakkiztasiga yetib bo'lmaydi. Shuning uchun `md:` klasslari ham
 * shartli: pin yo'q — gorizontal tartib ham yo'q.
 */
export default function CategoriesSection() {
  const sectionRef = useRef(null)
  const trackRef = useRef(null)
  const progressRef = useRef(null)
  const counterRef = useRef(null)
  const ctxRef = useRef(null)
  const isMobile = useIsMobile()
  // Bir marta hal qilinadi: batareya javobi kech kelib tartib
  // o'rtada sakrab ketmasin
  const [heavy] = useState(() => allowHeavyMotion())
  const stacked = isMobile || !heavy

  useEffect(() => {
    const section = sectionRef.current
    const track = trackRef.current
    // Zaif qurilmada lenta telefondagi kabi ustma-ust yotadi — pin va
    // scrub ikkalasi ham har kadrda qayta hisob talab qiladi (S-020)
    if (!section || !track || stacked) return

    // Pin qilinadigan lenta — bosh sahifaning uchinchi ekrani, shuning
    // uchun GSAP unga yaqinlashganda so'raladi (S-018).
    const cancel = loadGsapNear(section, ({ gsap, ScrollTrigger }) => {
      if (!sectionRef.current) return

      const ctx = gsap.context(() => {
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth)

        /* SNAP (S-019). Avval lenta qayerda qo'yib yuborilsa o'sha yerda
           qolardi — ko'pincha ikki panel orasida, ya'ni ikkalasi ham
           yarimta ko'rinib turardi. Endi eng yaqin panel chetiga
           yotib oladi.

           Panellar KENGLIGI HAR XIL (ochilish 52vw, kategoriya 46vw,
           yakuniy 34vw), shuning uchun `1/n` kabi teng qadam ishlamaydi —
           har bir panelning `offsetLeft` i progress'ga o'giriladi.
           `offsetLeft` tartib (layout) qiymati, ya'ni lentaga qo'yilgan
           `x` transformdan ta'sirlanmaydi. */
        const stops = () => {
          const d = distance()
          if (!d) return [0]
          const list = [...track.children].map((c) => Math.min(1, c.offsetLeft / d))
          return [...new Set(list)].sort((a, b) => a - b)
        }

        gsap.to(track, {
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
            snap: {
              snapTo: (value) =>
                stops().reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a)),
              // Qisqa: snap "tortib olish" emas, "joyiga qo'yish" bo'lsin
              duration: { min: 0.1, max: 0.35 },
              delay: 0.06,
              ease: 'power2.inOut',
            },
            /* `will-change` FAQAT lenta pin bo'lib turganda (S-018).
               Avval u ikkala elementda doimiy edi — ya'ni sahifa
               ochilganidan yopilgunicha ikkita kompozitor qatlami
               bekorga xotirada turardi. */
            onToggle: (self) => {
              track.classList.toggle('is-animating', self.isActive)
              progressRef.current?.classList.toggle('is-animating', self.isActive)
            },
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
      }, section)

      ctxRef.current = ctx
      ScrollTrigger.refresh()
    })

    return cancel
  }, [stacked])

  // Revert in useLayoutEffect so pin-spacer is removed BEFORE React unmounts
  useLayoutEffect(() => {
    return () => {
      ctxRef.current?.revert()
      ctxRef.current = null
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden bg-ink text-bone"
    >
      {/* fixed rail header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-baseline justify-between edge pt-16 md:pt-20">
        <span className="type-label text-clay">02 — Kolleksiyalar</span>
        <span className="type-label text-clay">
          <span ref={counterRef}>01</span> / {String(categories.length).padStart(2, '0')}
        </span>
      </div>

      <div
        ref={trackRef}
        className={`flex flex-col gap-16 py-32 ${
          stacked ? '' : 'md:h-[100svh] md:flex-row md:items-center md:gap-0 md:py-0 md:pt-10'
        }`}
      >
        {/* opening panel */}
        <div className={`shrink-0 edge ${stacked ? '' : 'md:flex md:h-full md:w-[52vw] md:flex-col md:justify-center'}`}>
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
            className={`group shrink-0 edge ${stacked ? '' : 'md:h-full md:w-[46vw] md:px-[2vw]'}`}
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
                  ratio="3 / 4"
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
        <div className={`shrink-0 edge ${stacked ? '' : 'md:flex md:h-full md:w-[34vw] md:flex-col md:justify-center'}`}>
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
            {/* `width` emas, `scaleX` (S-018): kenglik animatsiyasi har
                kadrda qayta tartiblashga (layout) majbur qilardi —
                transform esa faqat kompozitor ishi. Layout kengligi
                o'zgarmaydi: 24 → 44 = scaleX 1.833. */}
            <span className="mt-8 block h-px w-24 origin-left bg-bone/40 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[1.833]" />
          </Link>
        </div>
      </div>

      {/* rail progress */}
      <div className={`absolute inset-x-0 bottom-0 hidden h-px bg-bone/15 ${stacked ? '' : 'md:block'}`}>
        <div
          ref={progressRef}
          className="h-full origin-left scale-x-0 bg-bone"
        />
      </div>
    </section>
  )
}
