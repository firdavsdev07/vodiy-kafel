import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import PageHeader from '@/components/ui/PageHeader'
import SmartImage from '@/components/ui/SmartImage'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useReveal } from '@/hooks/useReveal'
import { playTone } from '@/lib/sound'
import JsonLd from '@/components/ui/JsonLd'
import Seo from '@/components/ui/Seo'
import { breadcrumbSchema } from '@/lib/schema'
import {
  SURFACE_LABEL,
  productCardModel,
  useCategories,
  useFactories,
  useProducts,
  useSizes,
} from '@/shared/api'

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

const PAGE_SIZE = 12

export default function Catalog() {
  const [params, setParams] = useSearchParams()
  const categorySlug = params.get('toifa') ?? 'all'
  const factoryId = params.get('zavod') ?? ''
  const sizeId = params.get('olcham') ?? ''
  const surface = params.get('sirt') ?? ''
  const urlSearch = params.get('q') ?? ''

  // Qidiruv matni ekranda DARHOL, URL/so'rovga esa kechikib yoziladi
  // (S-024: "debounce bilan") — har harfda backendga so'rov ketmasin.
  const [searchText, setSearchText] = useState(urlSearch)
  const debouncedSearch = useDebouncedValue(searchText, 400)

  useEffect(() => {
    if (debouncedSearch === (params.get('q') ?? '')) return
    const next = new URLSearchParams(params)
    if (debouncedSearch) next.set('q', debouncedSearch)
    else next.delete('q')
    setParams(next, { replace: true })
    // `params` ataylab bog'liqlikda YO'Q: har debounce'da faqat `q`
    // o'zgarsin, boshqa filtr o'zgarishi bu effektni qayta ishga
    // tushirmasin (ular o'zlari to'g'ridan-to'g'ri URL'ga yoziladi).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const categoriesQuery = useCategories()
  const factoriesQuery = useFactories()
  const sizesQuery = useSizes()
  const categories = categoriesQuery.data ?? []
  const factories = factoriesQuery.data ?? []
  const sizes = sizesQuery.data ?? []

  const selectedCategory = categories.find((c) => c.slug === categorySlug)
  const categoryId = selectedCategory?.id ?? ''
  // URL'da kategoriya bor-u, ro'yxat hali kelmagan bo'lsa — kategoriyasiz
  // (ya'ni HAMMA mahsulot) so'rov bir lahzaga ketib qolmasin.
  const categoriesReady = categorySlug === 'all' || categories.length > 0

  const filterKey = `${categoryId}|${factoryId}|${sizeId}|${surface}|${debouncedSearch}`
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 })
  const appendedRef = useRef({ key: '', page: 0 })

  // Filtr o'zgarsa — ro'yxat noldan boshlanadi.
  useEffect(() => {
    setPage(1)
    setItems([])
    appendedRef.current = { key: filterKey, page: 0 }
  }, [filterKey])

  const productsQuery = useProducts(
    { categoryId, factoryId, sizeId, surface, search: debouncedSearch, page, limit: PAGE_SIZE },
    { enabled: categoriesReady },
  )

  // Yangi sahifa kelganda ro'yxatga QO'SHILADI (1-sahifada — ALMASHTIRILADI).
  // `appendedRef` StrictMode'ning ikki martalik effekt chaqiruvida va
  // eski filtrning kech kelgan javobida ikki marta qo'shib yubormaydi.
  useEffect(() => {
    const data = productsQuery.data
    if (!data) return
    if (appendedRef.current.key !== filterKey) return
    if (appendedRef.current.page >= page) return
    appendedRef.current = { key: filterKey, page }
    setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]))
    setMeta({ total: data.total, totalPages: data.totalPages })
  }, [productsQuery.data, page, filterKey])

  const cards = useMemo(() => items.map(productCardModel), [items])

  const ref = useReveal({ start: 'top 88%', stagger: 0.05 })
  const filterRef = useRef(null)
  // Scroll-edge fade for the filter row (S-012): plain `overflow-x-auto`
  // gave no hint it scrolls at all — "Keramogranit" just cut off mid-word
  // with no arrow, no gradient, nothing.
  const [edges, setEdges] = useState({ left: false, right: false })

  const selectCategory = (slug) => {
    playTone('click')
    const next = new URLSearchParams(params)
    if (slug === 'all') next.delete('toifa')
    else next.set('toifa', slug)
    setParams(next, { replace: true })
  }

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
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
  }, [categories.length])

  // Active filter always in view (S-012) — scrolling in from a related
  // category page can land on a filter that's off to the right.
  useEffect(() => {
    filterRef.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [categorySlug])

  const loadingFirst = (productsQuery.isLoading || !categoriesReady) && page === 1
  const loadingMore = productsQuery.isFetching && page > 1
  const hasFilters = Boolean(categoryId || factoryId || sizeId || surface || debouncedSearch)
  const hasMore = page < meta.totalPages

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
        meta={meta.total ? `${cards.length} / ${meta.total} mahsulot` : undefined}
        lede="2026 material tanlovi: marmar tomirlari, issiq travertin va sokin tabiiy ohanglar. Makoningizga mos yuzani kashf eting."
      />

      {/* kategoriya lentasi */}
      <nav className="sticky top-[82px] z-30 bg-bone/95 backdrop-blur-md">
        <div className="hairline relative">
          <div
            ref={filterRef}
            onScroll={updateEdges}
            className="edge flex gap-x-6 gap-y-3 overflow-x-auto py-4 text-charcoal [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {[{ slug: 'all', name: 'Barchasi', index: '00' }, ...categories].map((cat, i) => {
              const on = categorySlug === cat.slug
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => selectCategory(cat.slug)}
                  aria-pressed={on}
                  className={`-my-4 type-label shrink-0 whitespace-nowrap border-b py-4 transition-colors duration-500 ${
                    on ? 'border-charcoal text-charcoal' : 'border-transparent text-clay hover:text-charcoal'
                  }`}
                >
                  {cat.index ?? String(i).padStart(2, '0')} {cat.name}
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

        {/* zavod / o'lcham / sirt / qidiruv — S-024 */}
        <div className="hairline edge flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
          <FilterSelect
            label="Zavod"
            value={factoryId}
            onChange={(v) => setFilter('zavod', v)}
            options={factories.map((f) => ({ value: f.id, label: f.name }))}
          />
          <FilterSelect
            label="O‘lcham"
            value={sizeId}
            onChange={(v) => setFilter('olcham', v)}
            options={sizes.map((s) => ({ value: s.id, label: s.label }))}
          />
          <FilterSelect
            label="Sirt"
            value={surface}
            onChange={(v) => setFilter('sirt', v)}
            options={Object.entries(SURFACE_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <label className="ml-auto flex min-w-0 flex-1 items-center gap-2 md:max-w-xs">
            <span className="sr-only">Mahsulot qidirish</span>
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Qidirish…"
              className="type-meta w-full border-b border-charcoal/25 bg-transparent py-2 text-charcoal placeholder:text-clay focus-visible:border-charcoal focus-visible:outline-none"
            />
          </label>
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
          {loadingFirst
            ? 'Yuklanmoqda'
            : cards.length === 0
              ? 'Bu tanlovda mahsulot yo‘q'
              : `${cards.length} ta mahsulot ko‘rsatilmoqda`}
        </p>

        {productsQuery.error ? (
          <CatalogError error={productsQuery.error} onRetry={productsQuery.refetch} />
        ) : loadingFirst ? (
          <CatalogSkeleton />
        ) : cards.length === 0 ? (
          <p className="type-editorial py-24 text-clay">
            {hasFilters
              ? 'Bu tanlovda hozircha mahsulot yo‘q.'
              : 'Katalog hozircha bo‘sh.'}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-12 md:gap-x-8 md:gap-y-[clamp(3rem,7vw,6rem)]">
              {cards.map((product, i) => {
                const r = RHYTHM[i % RHYTHM.length]
                return (
                  <article key={product.id} className={`${r.span} ${r.offset}`}>
                    <Link
                      to={`/catalog/${product.slug}`}
                      onClick={() => playTone('click')}
                      className="group block"
                    >
                      <SmartImage
                        src={product.src}
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
                          <div className="type-label text-clay">{product.categoryLabel}</div>
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

            {hasMore && (
              <div className="mt-[clamp(3rem,7vw,5rem)] flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => setPage((p) => p + 1)}
                  className="group flex items-center gap-3 type-action disabled:opacity-50"
                >
                  {loadingMore ? 'Yuklanmoqda…' : 'Yana ko‘rsatish'}
                  {!loadingMore && (
                    <span className="block h-px w-10 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2">
      <span className="type-label text-clay">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="type-meta border-b border-charcoal/25 bg-transparent py-2 pr-1 text-charcoal focus-visible:border-charcoal focus-visible:outline-none"
      >
        <option value="">Hammasi</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function CatalogSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-12 md:gap-x-8 md:gap-y-[clamp(3rem,7vw,6rem)]"
    >
      <span className="sr-only">Katalog yuklanmoqda</span>
      {RHYTHM.map((r, i) => (
        <div key={i} aria-hidden className={`${r.span} ${r.offset}`}>
          <span
            className="route-skeleton-bar block w-full"
            style={{ aspectRatio: r.ratio }}
          />
          <span
            className="route-skeleton-bar mt-4 block"
            style={{ width: '50%', height: '0.9rem' }}
          />
        </div>
      ))}
    </div>
  )
}

function CatalogError({ error, onRetry }) {
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
