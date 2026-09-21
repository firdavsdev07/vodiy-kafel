import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import PageHeader from '@/components/ui/PageHeader'
import SmartImage from '@/components/ui/SmartImage'
import { categories, categoryName } from '@/data/categories'
import { products } from '@/data/products'
import { useReveal } from '@/hooks/useReveal'
import { playTone } from '@/lib/sound'
import JsonLd from '@/components/ui/JsonLd'
import Seo from '@/components/ui/Seo'
import { breadcrumbSchema } from '@/lib/schema'

/**
 * Editorial grid, not a marketplace. The column rhythm repeats every five
 * items (7+5, 5+7, 12) so filtering never leaves a ragged row.
 */
const RHYTHM = [
  { span: 'md:col-span-7', ratio: '4 / 3', offset: '' },
  { span: 'md:col-span-5', ratio: '3 / 4', offset: 'md:mt-[6vw]' },
  { span: 'md:col-span-5', ratio: '3 / 4', offset: '' },
  { span: 'md:col-span-7', ratio: '4 / 3', offset: 'md:mt-[4vw]' },
  // Panoramic 16:9 — kept full-width on the mobile 2-col grid too (S-012),
  // otherwise it renders as a narrow sliver at half a phone's width.
  { span: 'col-span-2 md:col-span-12', ratio: '16 / 9', offset: '' },
]

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const active = params.get('toifa') ?? 'all'
  const ref = useReveal({ start: 'top 88%', stagger: 0.05 })
  const filterRef = useRef(null)
  // Scroll-edge fade for the filter row (S-012): plain `overflow-x-auto`
  // gave no hint it scrolls at all — "Keramogranit" just cut off mid-word
  // with no arrow, no gradient, nothing.
  const [edges, setEdges] = useState({ left: false, right: false })

  const visible = useMemo(
    () => (active === 'all' ? products : products.filter((p) => p.category === active)),
    [active],
  )

  const select = (slug) => {
    playTone('click')
    if (slug === 'all') setParams({}, { replace: true })
    else setParams({ toifa: slug }, { replace: true })
  }

  const updateEdges = () => {
    const el = filterRef.current
    if (!el) return
    setEdges({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    })
  }

  useEffect(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [])

  // Active filter always in view (S-012) — scrolling in from a related
  // category page can land on a filter that's off to the right.
  useEffect(() => {
    filterRef.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])

  return (
    <>
      <Seo
        title="Katalog"
        description="Keramika va keramogranit katalogi — marmar, tosh va beton effektlari. O‘lcham, sirt va zavod bo‘yicha tanlang."
      />

      <JsonLd
        data={breadcrumbSchema([
          { name: 'Bosh sahifa', path: '/' },
          { name: 'Katalog', path: '/catalog' },
        ])}
      />

      <PageHeader
        index="02"
        eyebrow="Katalog"
        title={['Katalog']}
        meta={`${visible.length} / ${products.length} mahsulot`}
        lede="2026 material tanlovi: marmar tomirlari, issiq travertin va sokin tabiiy ohanglar. Makoningizga mos yuzani kashf eting."
      />

      {/* filters */}
      <nav className="sticky top-[82px] z-30 bg-bone/95 backdrop-blur-md">
        <div className="hairline relative">
          <div
            ref={filterRef}
            onScroll={updateEdges}
            className="edge flex gap-x-6 gap-y-3 overflow-x-auto py-4 text-charcoal [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {[{ slug: 'all', name: 'Barchasi', index: '00' }, ...categories].map((cat) => {
              const on = active === cat.slug
              return (
                <button
                  key={cat.slug}
                  type="button"
                  data-cursor=""
                  onClick={() => select(cat.slug)}
                  aria-pressed={on}
                  className={`-my-4 type-label shrink-0 whitespace-nowrap border-b py-4 transition-colors duration-500 ${
                    on ? 'border-charcoal text-charcoal' : 'border-transparent text-clay hover:text-charcoal'
                  }`}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
          {/* Fade hints, not arrows — matches the site's quiet editorial
              chrome. Each side only shows while there's really more to
              scroll that way (S-012). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-bone to-transparent transition-opacity duration-300"
            style={{ opacity: edges.left ? 1 : 0 }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-bone to-transparent transition-opacity duration-300"
            style={{ opacity: edges.right ? 1 : 0 }}
          />
        </div>
      </nav>

      <section
        ref={ref}
        data-reveal=""
        className="relative z-10 edge pb-[clamp(6rem,14vw,12rem)] pt-[clamp(2.5rem,6vw,5rem)]"
      >
        {/* Filtr bosilganda ro'yxat JIM almashadi — ko'rib turgan odam
            buni sezadi, ekran o'quvchi esa yo'q. Shu qator o'zgarishni
            e'lon qiladi (S-040). `aria-live="polite"` — odam gapini
            bo'lmaydi, joriy o'qish tugagach aytiladi. */}
        <p className="sr-only" role="status" aria-live="polite">
          {visible.length === 0
            ? 'Bu toifada mahsulot yo‘q'
            : `${visible.length} ta mahsulot ko‘rsatilmoqda`}
        </p>

        {visible.length === 0 ? (
          <p className="type-editorial py-24 text-clay">
            Bu toifada hozircha mahsulot yo‘q.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-12 md:gap-x-8 md:gap-y-[clamp(3rem,7vw,6rem)]">
            {visible.map((product, i) => {
              const r = RHYTHM[i % RHYTHM.length]
              return (
                <article key={product.id} className={`${r.span} ${r.offset}`}>
                  <Link
                    to={`/catalog/${product.slug}`}
                    data-cursor="Ko‘rish"
                    onClick={() => playTone('click')}
                    className="group block"
                  >
                    <SmartImage
                      id={product.image}
                      alt={product.name}
                      ratio={r.ratio}
                      sizes="(max-width: 767px) 92vw, (max-width: 1279px) 50vw, 58vw"
                      className="w-full"
                      imgClassName="transition-transform duration-[1500ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.055]"
                    />

                    {/* Stacked on mobile, side-by-side from md — the old
                        `flex-wrap justify-between` crowded index/name
                        against category/size in a 2-col mobile card (S-012). */}
                    <div className="mt-4 flex flex-col gap-4 border-t border-charcoal/12 pt-3 md:mt-5 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-6 md:pt-4">
                      <div>
                        <div className="type-label text-clay">
                          {String(i + 1).padStart(2, '0')} / {product.collection}
                        </div>
                        <h2 className="mt-2 text-[clamp(1.05rem,2.2vw,1.9rem)] font-semibold leading-none tracking-[-0.02em] md:mt-3">
                          {product.name}
                        </h2>
                      </div>
                      <div className="md:shrink-0 md:text-right">
                        <div className="type-label text-clay">{categoryName(product.category)}</div>
                        <div className="mt-2 type-meta md:mt-3">
                          {product.size} · {product.finish}
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
