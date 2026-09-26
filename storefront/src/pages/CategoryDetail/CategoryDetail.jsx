import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import { refreshScrollTriggers } from '@/animations/gsap'
import ProductGrid from '@/components/ui/ProductGrid'
import SmartImage from '@/components/ui/SmartImage'
import { categories, categoryBySlug } from '@/data/categories'
import { useReveal } from '@/hooks/useReveal'
import NotFound from '@/pages/NotFound/NotFound'
import Seo from '@/components/ui/Seo'
import { productCardModel, useCategories, useProducts } from '@/shared/api'

/** Toifa sahifasida bir yo'la chiqadigan mahsulotlar — qolgani katalogda. */
const CATEGORY_LIMIT = 24

export default function CategoryDetail() {
  const { slug } = useParams()
  const category = categoryBySlug(slug)
  const headRef = useReveal({ start: 'top 92%', stagger: 0.08 })
  const bodyRef = useReveal({ start: 'top 85%' })

  // Matn va muqova hali mahalliy (`categories.js`), mahsulotlar — API
  // (T-012). Slug → id: `GET /categories` keshi katalog filtri bilan umumiy.
  const categoriesQuery = useCategories()
  const apiCategory = categoriesQuery.data?.find((c) => c.slug === slug)
  const productsQuery = useProducts(
    { categoryId: apiCategory?.id, limit: CATEGORY_LIMIT },
    { enabled: Boolean(apiCategory) },
  )
  const items = useMemo(
    () => (productsQuery.data?.items ?? []).map(productCardModel),
    [productsQuery.data],
  )
  const total = productsQuery.data?.total
  const error = categoriesQuery.error ?? productsQuery.error
  const retry = categoriesQuery.error ? categoriesQuery.refetch : productsQuery.refetch
  // Backendda bunday toifa yo'q bo'lsa `apiCategory` bo'sh, mahsulot
  // so'rovi umuman ketmaydi — bu "yuklanmoqda" emas, "mahsulot yo'q".
  const loading = categoriesQuery.isLoading || productsQuery.isLoading

  // Ro'yxat balandligi javob kelgach o'zgaradi — pastdagi ScrollTrigger
  // nuqtalari eski balandlikda qolib ketmasin (CollectionsSection kabi).
  useEffect(() => {
    if (!loading) refreshScrollTriggers()
  }, [loading, items.length])

  if (!category) return <NotFound />

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
          <Link to="/categories" className="relative type-label text-clay before:absolute before:-inset-4 before:content-[''] hover:text-charcoal">
            ← Indeks
          </Link>
          {total != null && <span className="type-label text-clay">{total} mahsulot</span>}
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
          {error ? (
            <CategoryError error={error} onRetry={retry} />
          ) : loading ? (
            <CategorySkeleton />
          ) : items.length ? (
            <>
              <ProductGrid items={items} />
              {total > items.length && (
                <Link
                  to={`/catalog?toifa=${encodeURIComponent(category.slug)}`}
                  className="group mt-[clamp(3rem,7vw,5rem)] flex items-center gap-3 type-action"
                >
                  Hammasi katalogda — {total} mahsulot
                  <span className="block h-px w-10 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
                </Link>
              )}
            </>
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

/** Yuklanish — `ProductGrid` ning uch ustunli ritmi bilan bir xil. */
function CategorySkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid grid-cols-1 gap-x-8 gap-y-[clamp(2.5rem,6vw,5rem)] md:grid-cols-2 lg:grid-cols-3"
    >
      <span className="sr-only">Mahsulotlar yuklanmoqda</span>
      {['4 / 5', '3 / 4', '3 / 4'].map((ratio, i) => (
        <span
          key={i}
          aria-hidden
          className={`route-skeleton-bar block w-full ${i === 1 ? 'lg:mt-[5vw]' : ''}`}
          style={{ aspectRatio: ratio }}
        />
      ))}
    </div>
  )
}

/** Katalog sahifasidagi xato bloki bilan bir xil ohang (S-031). */
function CategoryError({ error, onRetry }) {
  return (
    <div className="hairline pt-4">
      <p className="max-w-[44ch] text-clay">{error.message}</p>
      {error.isRetryable && (
        <button
          type="button"
          onClick={onRetry}
          className="group mt-8 flex items-center gap-3 type-action"
        >
          Qayta urinish
          <span className="block h-px w-10 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
        </button>
      )}
    </div>
  )
}
