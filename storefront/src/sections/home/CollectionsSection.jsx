import { useEffect } from 'react'
import { Link } from 'react-router-dom'

import { refreshScrollTriggers } from '@/animations/gsap'
import SmartImage from '@/components/ui/SmartImage'
import { useReveal } from '@/hooks/useReveal'
import { productCardModel, useProducts } from '@/shared/api'

/**
 * Bosh sahifadagi "tanlangan" mahsulotlar soni. Mock'da ham to'rtta edi —
 * chap/o'ng almashinuvi juft sonda chiroyli yopiladi.
 */
const FEATURED_LIMIT = 4

/**
 * "Tanlangan" = eng ko'p ko'rilgan (T-012). Backendda alohida `featured`
 * bayrog'i yo'q; `viewCount` — ochiq API beradigan yagona tanlov mezoni
 * va u o'zi yangilanib turadi (`POST /products/{slug}/view`).
 */
const FEATURED_PARAMS = { sortBy: 'viewCount', sortOrder: 'desc', limit: FEATURED_LIMIT }

/** Project-scale presentation, not product cards. */
export default function CollectionsSection() {
  const headRef = useReveal({ start: 'top 78%' })
  const { data, isLoading } = useProducts(FEATURED_PARAMS)
  const items = data?.items ?? []

  // Bo'lim balandligi javob kelgach o'zgaradi — pastdagi bo'limlarning
  // ScrollTrigger nuqtalari eski balandlik bo'yicha qolib ketmasin.
  useEffect(() => {
    if (!isLoading) refreshScrollTriggers()
  }, [isLoading, items.length])

  // Xato yoki bo'sh katalog — bo'lim umuman chiqmaydi. Reklama sahifasida
  // "Tanlangan kolleksiyalar" sarlavhasi ostida bo'sh joy ishonchni
  // yo'qotadi; katalogga havola menyuda baribir bor.
  if (!isLoading && items.length === 0) return null

  return (
    <section className="relative z-10 bg-bone edge py-[clamp(6rem,15vw,13rem)]">
      <div ref={headRef} data-reveal="">
        <div className="flex items-baseline justify-between">
          <span className="type-label text-clay">04 — Tanlov</span>
          <Link
            to="/catalog"
            className="group -my-3.5 flex items-center gap-3 py-3.5 type-action"
          >
            Butun katalog
            <span className="block h-px w-8 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
          </Link>
        </div>

        <h2 className="mt-[clamp(2.5rem,7vw,6rem)] type-head">
          <span className="line-mask">
            <span className="r-line">Tanlangan</span>
          </span>
          <span className="line-mask">
            <span className="r-line">kolleksiyalar</span>
          </span>
        </h2>
      </div>

      <div
        className="mt-[clamp(4rem,10vw,9rem)] flex flex-col gap-[clamp(4rem,9vw,8rem)]"
        aria-busy={isLoading || undefined}
      >
        {isLoading
          ? Array.from({ length: FEATURED_LIMIT }, (_, i) => <FeaturedSkeleton key={i} index={i} />)
          : items.map((dto, i) => (
              <FeaturedProduct key={dto.id} product={productCardModel(dto)} index={i} />
            ))}
      </div>
    </section>
  )
}

/** Juft/toq qatorlar oynali joylashadi: rasm chapda, keyin o'ngda. */
function layout(index) {
  const flipped = index % 2 === 1
  return {
    row: `grid items-end gap-6 md:grid-cols-12 md:gap-8 ${flipped ? 'md:[direction:rtl]' : ''}`,
    media: `md:[direction:ltr] ${flipped ? 'md:col-span-7 md:col-start-6' : 'md:col-span-8'}`,
    text: `md:[direction:ltr] ${
      flipped ? 'md:col-span-4 md:col-start-1 md:row-start-1' : 'md:col-span-3'
    }`,
    ratio: index % 3 === 0 ? '16 / 10' : '4 / 3',
  }
}

/**
 * Har bir mahsulot o'z reveal'iga ega: ma'lumot tarmoqdan KEYIN keladi,
 * bo'lim darajasidagi reveal esa elementlarni mount paytida yig'ib
 * oladi — kech kelgan qatorlar unda yashirin qolib ketardi.
 */
function FeaturedProduct({ product, index }) {
  const ref = useReveal({ start: 'top 82%' })
  const { row, media, text, ratio } = layout(index)
  const href = `/catalog/${product.slug}`

  return (
    <article ref={ref} data-reveal="" className={row}>
      <Link to={href} className={`group block ${media}`}>
        <SmartImage
          src={product.src}
          alt={product.name}
          ratio={ratio}
          sizes="(max-width: 767px) 92vw, 60vw"
          className="w-full"
          imgClassName="transition-transform duration-[1600ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]"
        />
      </Link>

      <div className={text}>
        <div className="r-fade flex items-baseline gap-4">
          <span className="type-label text-clay">{String(index + 1).padStart(2, '0')}</span>
          {product.collection && (
            <span className="type-label text-clay">{product.collection}</span>
          )}
        </div>
        <h3 className="r-fade mt-4 type-sub">
          <Link to={href}>{product.name}</Link>
        </h3>
        <dl className="r-fade mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-charcoal/15 pt-4">
          <Spec label="O‘lcham" value={product.size} />
          <Spec label="Yuza" value={product.finish} />
          <Spec label="Toifa" value={product.categoryLabel} />
        </dl>
      </div>
    </article>
  )
}

/** Bo'sh qiymat — qator chiqmaydi (masalan o'lchami biriktirilmagan mahsulot). */
function Spec({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="type-label text-clay">{label}</dt>
      <dd className="mt-1.5 type-meta">{value}</dd>
    </div>
  )
}

/** Yuklanish paytidagi o'rin — yakuniy joylashuv bilan bir xil, sakrash bo'lmasin. */
function FeaturedSkeleton({ index }) {
  const { row, media, text, ratio } = layout(index)
  return (
    <div className={row} aria-hidden="true">
      <span className={`route-skeleton-bar ${media}`} style={{ aspectRatio: ratio }} />
      <div className={`flex flex-col gap-4 ${text}`}>
        <span className="route-skeleton-bar" style={{ width: '30%', height: '0.8rem' }} />
        <span className="route-skeleton-bar" style={{ width: '75%', height: '2rem' }} />
        <span className="route-skeleton-bar" style={{ width: '100%', height: '3rem' }} />
      </div>
    </div>
  )
}
