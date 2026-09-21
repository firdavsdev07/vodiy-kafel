import { Link, useParams } from 'react-router-dom'

import ProductGrid from '@/components/ui/ProductGrid'
import SmartImage from '@/components/ui/SmartImage'
import { categories, categoryBySlug } from '@/data/categories'
import { productsByCategory } from '@/data/products'
import { useReveal } from '@/hooks/useReveal'
import NotFound from '@/pages/NotFound/NotFound'
import Seo from '@/components/ui/Seo'

export default function CategoryDetail() {
  const { slug } = useParams()
  const category = categoryBySlug(slug)
  const headRef = useReveal({ start: 'top 92%', stagger: 0.08 })
  const bodyRef = useReveal({ start: 'top 85%' })

  if (!category) return <NotFound />

  const items = productsByCategory(category.slug)

  return (
    <>
      <Seo
        title={category.name}
        description={category.description || `${category.name} — Vodiy Kafel katalogi.`}
      />

      <header
        ref={headRef}
        data-reveal=""
        className="relative z-10 edge pb-[clamp(3rem,7vw,6rem)] pt-[clamp(7rem,16vw,13rem)]"
      >
        <div className="flex items-baseline justify-between">
          {/* Touch target ≥44px (S-015): invisible `::before` extends the
              hit area without changing the visible link's size/position. */}
          <Link to="/categories" data-cursor="" className="relative type-label text-clay before:absolute before:-inset-4 before:content-[''] hover:text-charcoal">
            ← Indeks
          </Link>
          <span className="type-label text-clay">{items.length} mahsulot</span>
        </div>

        <div className="mt-[clamp(2rem,6vw,4.5rem)] flex items-start gap-6">
          <span className="type-label mt-[0.9em] shrink-0 text-clay">{category.index}</span>
          <h1 className="type-display">
            <span className="line-mask">
              <span className="r-line">{category.name}</span>
            </span>
          </h1>
        </div>

        <div className="mt-[clamp(2.5rem,6vw,5rem)] grid gap-8 md:grid-cols-12">
          <p className="r-fade type-editorial md:col-span-5">{category.tagline}</p>
          {/* Qator uzunligi 75 belgidan oshmasin (S-006) — cheklovsiz 5
              ustunda 1920px da ≈90 belgi/qator chiqardi. */}
          <p className="r-fade max-w-[48ch] text-clay md:col-span-5 md:col-start-8">
            {category.description}
          </p>
        </div>
      </header>

      {/* category visual */}
      <section ref={bodyRef} data-reveal="" className="relative z-10">
        <div className="edge">
          <SmartImage
            id={category.cover}
            alt={category.name}
            ratio="21 / 9"
            sizes="92vw"
            width={2200}
            className="w-full"
          />
        </div>

        {/* sibling navigation */}
        <nav className="edge mt-[clamp(3rem,7vw,5rem)]">
          <div className="hairline flex gap-6 overflow-x-auto py-4 text-charcoal [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((c) => (
              <Link
                key={c.slug}
                to={`/categories/${c.slug}`}
                data-cursor=""
                className={`-my-4 type-label shrink-0 whitespace-nowrap border-b py-4 transition-colors duration-500 ${
                  c.slug === category.slug
                    ? 'border-charcoal text-charcoal'
                    : 'border-transparent text-clay hover:text-charcoal'
                }`}
              >
                {c.index} {c.name}
              </Link>
            ))}
          </div>
        </nav>

        <div className="edge pb-[clamp(6rem,14vw,12rem)] pt-[clamp(3rem,8vw,6rem)]">
          {items.length ? (
            <ProductGrid items={items} />
          ) : (
            <p className="type-editorial py-16 text-clay">
              Bu toifada hozircha mahsulot yo‘q.
            </p>
          )}
        </div>
      </section>
    </>
  )
}
