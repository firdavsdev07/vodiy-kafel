import { Link } from 'react-router-dom'

import PageHeader from '@/components/ui/PageHeader'
import SmartImage from '@/components/ui/SmartImage'
import { useReveal } from '@/hooks/useReveal'
import { galleryItemModel, useGallery } from '@/shared/api'
import { breadcrumbSchema, gallerySchema } from '@/lib/schema'
import JsonLd from '@/components/ui/JsonLd'
import Seo from '@/components/ui/Seo'

/**
 * Loyiha galereyasi (S-027) — `GET /gallery`.
 *
 * Katalog "bizda nima bor" degan savolga javob beradi, galereya esa
 * "u haqiqatda qanday ko'rinadi" degan savolga. Shuning uchun bu yerda
 * xususiyat ham, filtr ham yo'q: faqat surat, joy nomi va — agar
 * bog'langan bo'lsa — mahsulotga o'tish havolasi.
 */
export default function Gallery() {
  const { data, error, refetch } = useGallery({ limit: 24 })
  const items = (data?.items ?? []).map(galleryItemModel)
  const total = data?.total ?? 0

  return (
    <>
      <Seo
        title="Galereya"
        description="Vodiy bo‘ylab yakunlangan obyektlar — haqiqiy interyerlarda Vodiy Kafel yuzalari."
      />

      <PageHeader
        index="04"
        eyebrow="Galereya"
        title={['Bajarilgan', 'ishlar.']}
        meta={total ? `${String(total).padStart(2, '0')} ta loyiha` : undefined}
        lede="Vodiy bo‘ylab yakunlangan obyektlar. Suratdagi yuza qaysi mahsulot ekanini bilish uchun ustiga bosing."
      />

      {items.length > 0 && <JsonLd data={gallerySchema(items)} />}
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Bosh sahifa', path: '/' },
          { name: 'Galereya', path: '/gallery' },
        ])}
      />

      {error ? (
        <GalleryError error={error} onRetry={refetch} />
      ) : !data ? (
        <GallerySkeleton />
      ) : items.length === 0 ? (
        <Empty />
      ) : (
        <GalleryGrid items={items} />
      )}
    </>
  )
}

function GalleryGrid({ items }) {
  const ref = useReveal({ start: 'top 88%' })

  return (
    <section
      ref={ref}
      data-reveal=""
      className="relative z-10 edge pb-[clamp(5rem,12vw,10rem)]"
    >
      {/* Almashib turuvchi nisbatlar — qator "kartochkalar jadvali"
          bo'lib qolmasin (ProductGrid dagi bilan bir ohangda). */}
      <div className="grid grid-cols-1 gap-x-8 gap-y-[clamp(2.5rem,6vw,5rem)] md:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <figure key={item.id} className={i % 3 === 1 ? 'lg:mt-[5vw]' : ''}>
            <GalleryImage item={item} index={i} />

            <figcaption className="mt-4 border-t border-charcoal/12 pt-4">
              <div className="type-label text-clay">
                {String(i + 1).padStart(2, '0')}
                {item.title ? ` / ${item.title}` : ''}
              </div>
              {item.product ? (
                <div className="mt-3 type-meta">{item.product.name}</div>
              ) : (
                // Mahsulot bog'lanmagan — bo'sh havola yasalmaydi.
                <div className="mt-3 type-meta text-clay">Mahsulot ko‘rsatilmagan</div>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

/** Bog'langan mahsulot bo'lsa — butun surat havola bo'ladi. */
function GalleryImage({ item, index }) {
  const picture = (
    <SmartImage
      src={item.image}
      alt={item.title || 'Bajarilgan ish'}
      ratio={index % 4 === 0 ? '4 / 5' : '3 / 4'}
      sizes="(max-width: 767px) 92vw, (max-width: 1023px) 46vw, 30vw"
      className="w-full"
      imgClassName="transition-transform duration-[1500ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.055]"
    />
  )

  if (!item.product) return <div className="block">{picture}</div>

  return (
    <Link to={item.product.to} data-cursor="Mahsulot" className="group block">
      {picture}
    </Link>
  )
}

function Empty() {
  return (
    <section className="relative z-10 edge pb-[clamp(5rem,12vw,10rem)]">
      <div className="hairline pt-4">
        <p className="max-w-[44ch] text-clay">
          Galereya hozircha bo‘sh. Yangi obyektlar qo‘shilgani sari shu yerda
          paydo bo‘ladi.
        </p>
      </div>
    </section>
  )
}

function GallerySkeleton() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="relative z-10 edge pb-[clamp(5rem,12vw,10rem)]"
    >
      <span className="sr-only">Galereya yuklanmoqda</span>
      <div className="grid grid-cols-1 gap-x-8 gap-y-[clamp(2.5rem,6vw,5rem)] md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} aria-hidden>
            <span
              className="route-skeleton-bar block w-full"
              style={{ aspectRatio: i % 4 === 0 ? '4 / 5' : '3 / 4' }}
            />
            <span
              className="route-skeleton-bar mt-4 block"
              style={{ width: '60%', height: '0.9rem' }}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

function GalleryError({ error, onRetry }) {
  return (
    <section className="relative z-10 edge pb-[clamp(5rem,12vw,10rem)]">
      <div className="hairline pt-4">
        <p className="max-w-[44ch] text-clay">{error.message}</p>
        {error.isRetryable && (
          <button
            type="button"
            onClick={onRetry}
            data-cursor=""
            className="group mt-8 flex items-center gap-3 type-action"
          >
            Qayta urinish
            <span className="block h-px w-10 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
          </button>
        )}
      </div>
    </section>
  )
}
