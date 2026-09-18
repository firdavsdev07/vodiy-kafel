import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import PageHeader from '@/components/ui/PageHeader'
import SmartImage from '@/components/ui/SmartImage'
import { categories, categoryName } from '@/data/categories'
import { products } from '@/data/products'
import { useReveal } from '@/hooks/useReveal'
import { playTone } from '@/lib/sound'

/**
 * Editorial grid, not a marketplace. The column rhythm repeats every five
 * items (7+5, 5+7, 12) so filtering never leaves a ragged row.
 */
const RHYTHM = [
  { span: 'md:col-span-7', ratio: '4 / 3', offset: '' },
  { span: 'md:col-span-5', ratio: '3 / 4', offset: 'md:mt-[6vw]' },
  { span: 'md:col-span-5', ratio: '3 / 4', offset: '' },
  { span: 'md:col-span-7', ratio: '4 / 3', offset: 'md:mt-[4vw]' },
  { span: 'md:col-span-12', ratio: '16 / 9', offset: '' },
]

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const active = params.get('toifa') ?? 'all'
  const ref = useReveal({ start: 'top 88%', stagger: 0.05 })

  const visible = useMemo(
    () => (active === 'all' ? products : products.filter((p) => p.category === active)),
    [active],
  )

  const select = (slug) => {
    playTone('click')
    if (slug === 'all') setParams({}, { replace: true })
    else setParams({ toifa: slug }, { replace: true })
  }

  return (
    <>
      <PageHeader
        index="02"
        eyebrow="Katalog"
        title={['Katalog']}
        meta={`${visible.length} / ${products.length} mahsulot`}
        lede="2026 material tanlovi: marmar tomirlari, issiq travertin va sokin tabiiy ohanglar. Makoningizga mos yuzani kashf eting."
      />

      {/* filters */}
      <nav className="sticky top-[82px] z-30 bg-bone/95 backdrop-blur-md">
        <div className="hairline edge flex gap-x-6 gap-y-3 overflow-x-auto py-4 text-charcoal [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ slug: 'all', name: 'Barchasi', index: '00' }, ...categories].map((cat) => {
            const on = active === cat.slug
            return (
              <button
                key={cat.slug}
                type="button"
                data-cursor=""
                onClick={() => select(cat.slug)}
                aria-pressed={on}
                className={`type-label shrink-0 whitespace-nowrap border-b pb-1 transition-colors duration-500 ${
                  on ? 'border-charcoal text-charcoal' : 'border-transparent text-clay hover:text-charcoal'
                }`}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </nav>

      <section
        ref={ref}
        data-reveal=""
        className="relative z-10 edge pb-[clamp(6rem,14vw,12rem)] pt-[clamp(2.5rem,6vw,5rem)]"
      >
        {visible.length === 0 ? (
          <p className="type-editorial py-24 text-clay">
            Bu toifada hozircha mahsulot yo‘q.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-[clamp(3rem,7vw,6rem)] md:grid-cols-12">
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

                    <div className="mt-5 flex flex-wrap items-start justify-between gap-6 border-t border-charcoal/12 pt-4">
                      <div>
                        <div className="type-label text-clay">
                          {String(i + 1).padStart(2, '0')} / {product.collection}
                        </div>
                        <h2 className="mt-3 text-[clamp(1.25rem,2.2vw,1.9rem)] font-semibold leading-none tracking-[-0.02em]">
                          {product.name}
                        </h2>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="type-label text-clay">{categoryName(product.category)}</div>
                        <div className="mt-3 type-meta">
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
