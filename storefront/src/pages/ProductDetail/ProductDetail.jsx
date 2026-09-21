import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

import Product360 from '@/components/ui/Product360'
import ProductGrid from '@/components/ui/ProductGrid'
import JsonLd from '@/components/ui/JsonLd'
import Seo from '@/components/ui/Seo'
import SmartImage from '@/components/ui/SmartImage'
import { company } from '@/data/company'
import { useReveal } from '@/hooks/useReveal'
import NotFound from '@/pages/NotFound/NotFound'
import { breadcrumbSchema, productSchema } from '@/lib/schema'
import {
  AVAILABILITY_LABEL,
  SURFACE_LABEL,
  assetUrl,
  groupMedia,
  productCardModel,
  recordProductView,
  useMainBranch,
  useProduct,
  useSimilarProducts,
} from '@/shared/api'

/**
 * Mahsulot sahifasi — to'liq API'dan (S-023).
 *
 *   `GET /products/{slug}`          — mahsulot va `media[]`
 *   `GET /products/{slug}/similar`  — pastdagi "shunga o'xshash" bloki
 *   `POST /products/{slug}/view`    — ko'rishlar hisoblagichi
 *
 * 🔒 Narx ham, ombordagi aniq son ham YO'Q (G1). Ochiq saytda faqat
 *    "bor / yo'q". Qolgani — optom kabinetida (`dashboard/`).
 */
export default function ProductDetail() {
  const { slug } = useParams()
  const { data: product, error, refetch } = useProduct(slug)
  const { data: similar } = useSimilarProducts(slug)

  /* Ko'rish BIR MARTA sanaladi va faqat mahsulot HAQIQATAN topilganda:
     mavjud bo'lmagan slug uchun so'rov yuborish — serverga bekorga
     404 yasash. Takrorlanishdan `recordProductView` ning o'zi saqlaydi. */
  useEffect(() => {
    if (product?.slug) recordProductView(product.slug)
  }, [product?.slug])

  /* Tartib ataylab shunday:
       1. ma'lumot bor — ko'rsatiladi. Fonda qayta so'rov yiqilsa ham
          ekrandagi mahsulot xato sahifasiga almashmaydi
       2. 404 — mahsulot yo'q, o'chirilgan yoki zavodi o'chirilgan.
          Ataylab farqlanmaydi (api CLAUDE.md, IDOR qoidasi)
       3. boshqa xato — qayta urinish bilan
       4. qolgan hamma holat (`idle` ham, `loading` ham) — skelet.
          `idle` qisqa: effekt hali so'rovni boshlamagan birinchi kadr */
  if (product) return <ProductView product={product} similar={similar} />
  if (error?.isNotFound) return <NotFound />
  if (error) return <ProductError error={error} onRetry={refetch} />
  return <ProductSkeleton />
}

function ProductView({ product, similar }) {
  const headRef = useReveal({ start: 'top 92%', stagger: 0.07 })
  const bodyRef = useReveal({ start: 'top 82%' })
  const ctaRef = useReveal({ start: 'top 82%' })

  const { data: branch } = useMainBranch()
  const { images, frames, videos } = useMemo(() => groupMedia(product.media), [product.media])
  const related = useMemo(() => (similar ?? []).map(productCardModel), [similar])

  // Asosiy surat: birinchi oddiy rasm, bo'lmasa kartadagi rasm
  // (`primaryImageUrl` — `/uploads/...`, ya'ni to'liq manzilga keltiriladi).
  const hero = images[0]?.src || assetUrl(product.primaryImageUrl)
  const rest = images.slice(1)

  const spec = [
    ['Zavod', product.factory?.name],
    ['O‘lcham', product.size?.label ? `${product.size.label} sm` : null],
    ['Yuza', SURFACE_LABEL[product.surface]],
    ['Rang', product.color],
    // Satr ko'rinishida keladi va SHUNDAYLIGICHA ko'rsatiladi: songa
    // aylantirilsa aniqlik yo'qoladi (api CLAUDE.md, 7-qoida).
    ['1 paddon', product.sqmPerPallet ? `${product.sqmPerPallet} m²` : null],
    ['Paddon og‘irligi', product.weightPerPallet ? `${product.weightPerPallet} kg` : null],
    ['Holati', AVAILABILITY_LABEL[product.availability]],
  ].filter(([, value]) => value)

  return (
    <>
      {/* Sarlavhada nom + zavod + o'lcham: qidiruv natijasida ham,
          ulashilgan havolada ham mahsulot aniq ajralib tursin.
          ⚠ `og:image` ga mahsulot surati BERILMAYDI — u Marazzi'niki
            (ASSETS.md, S-033). */}
      <Seo
        title={[product.name, product.factory?.name, product.size?.label]
          .filter(Boolean)
          .join(' · ')}
        description={
          product.description ||
          `${product.name} — ${product.size?.label ?? ''} ${SURFACE_LABEL[product.surface] ?? ''}`.trim()
        }
        type="product"
      />

      {/* 🔒 `Offer` da narx YO'Q — ochiq saytda narx ko'rsatilmaydi (G1).
          `availability` beriladi, `price` berilmaydi (S-039). */}
      <JsonLd data={productSchema(product, { image: hero || undefined })} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Bosh sahifa', path: '/' },
          { name: 'Katalog', path: '/catalog' },
          { name: product.name, path: `/catalog/${product.slug}` },
        ])}
      />

      <header
        ref={headRef}
        data-reveal=""
        className="relative z-10 edge pb-[clamp(2.5rem,6vw,4rem)] pt-[clamp(7rem,16vw,13rem)]"
      >
        <div className="flex items-baseline justify-between">
          {/* Touch target ≥44px (S-015): invisible `::before` extends the
              hit area without changing the visible link's size/position. */}
          <Link to="/catalog" data-cursor="" className="relative type-label text-clay before:absolute before:-inset-4 before:content-[''] hover:text-charcoal">
            ← Katalog
          </Link>
          <span className="type-label text-clay">
            {product.factory?.name} / {SURFACE_LABEL[product.surface]}
          </span>
        </div>

        <h1 className="mt-[clamp(2rem,6vw,4.5rem)] type-display">
          <span className="line-mask">
            <span className="r-line">{product.name}</span>
          </span>
        </h1>
      </header>

      {/* hero image with the metadata set around it */}
      <section ref={bodyRef} data-reveal="" className="relative z-10 edge">
        <div className="grid gap-8 md:grid-cols-12">
          <div className="md:col-span-9">
            <SmartImage
              src={hero}
              alt={product.name}
              ratio="16 / 10"
              sizes="(max-width: 767px) 92vw, 72vw"
              priority
              className="w-full"
            />
          </div>

          <dl className="r-fade flex flex-col gap-6 md:col-span-3">
            {spec.map(([label, value]) => (
              <div key={label} className="border-t border-charcoal/12 pt-3">
                <dt className="type-label text-clay">{label}</dt>
                <dd className="mt-2 type-meta">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* description */}
        <div className="mt-[clamp(4rem,9vw,8rem)] grid gap-8 md:grid-cols-12">
          {product.description && (
            <p className="r-fade type-editorial md:col-span-7">{product.description}</p>
          )}
          <div className="r-fade md:col-span-4 md:col-start-9">
            <div className="type-label text-clay">Eslatma</div>
            <p className="mt-4 text-clay">
              Ekrandagi rang yorug‘likka qarab o‘zgaradi. Yakuniy tanlovni
              showroomda, tabiiy yorug‘likda qilishni tavsiya qilamiz.
            </p>
          </div>
        </div>

        {/* 360° — bo'lsa, o'z bo'limi bilan: u sudraladigan yuza, oddiy
            suratlar qatoriga qo'shilsa odam uni sezmay o'tib ketardi */}
        {(frames.length > 0 || videos.length > 0) && (
          <div className="mt-[clamp(4rem,10vw,9rem)] grid gap-8 md:grid-cols-12">
            {frames.length > 0 && (
              <Product360
                frames={frames}
                alt={product.name}
                ratio="4 / 3"
                className="md:col-span-7"
              />
            )}
            {videos.map((video) => (
              <div key={video.id} className="md:col-span-5">
                {/* `muted` + `playsInline` — telefonda ham shu yerda
                    o'ynaydi, o'zi to'liq ekranga o'tib ketmaydi.
                    `autoPlay` YO'Q: harakatni odam boshlaydi (S-020). */}
                <video
                  src={video.src}
                  controls
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full bg-stone object-cover"
                  style={{ aspectRatio: '4 / 3' }}
                />
                <div className="mt-3 type-label text-clay">360° video</div>
              </div>
            ))}
          </div>
        )}

        {/* material study */}
        {rest.length > 0 && (
          <div className="mt-[clamp(4rem,10vw,9rem)] grid gap-6 md:grid-cols-12 md:gap-8">
            {rest.map((media, i) => (
              <div
                key={media.id}
                className={
                  i === 0
                    ? 'md:col-span-7'
                    : i === 1
                      ? 'md:col-span-5 md:mt-[6vw]'
                      : 'md:col-span-8 md:col-start-3'
                }
              >
                <SmartImage
                  src={media.src}
                  alt={`${product.name} — ${i + 1}`}
                  ratio={i === 1 ? '3 / 4' : '4 / 3'}
                  sizes="(max-width: 767px) 92vw, 58vw"
                  className="w-full"
                />
                <div className="mt-3 type-label text-clay">
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA — no cart, this is a showroom business */}
      <section
        ref={ctaRef}
        data-reveal=""
        className="relative z-10 mt-[clamp(5rem,12vw,10rem)] bg-charcoal text-bone"
      >
        <div className="edge py-[clamp(4rem,10vw,8rem)]">
          <span className="r-fade type-label text-clay">Keyingi qadam</span>
          <h2 className="mt-8 type-head">
            <span className="line-mask">
              <span className="r-line">Showroomda</span>
            </span>
            <span className="line-mask">
              <span className="r-line">ko‘ring.</span>
            </span>
          </h2>

          <div className="mt-12 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <p className="r-fade max-w-[40ch] text-clay">
              {product.name} namunasi{branch ? ` ${branch.city} ` : ' '}showroomida
              mavjud. Kelishdan oldin qo‘ng‘iroq qiling — namunani tayyorlab
              qo‘yamiz.
            </p>

            <div className="r-fade flex flex-wrap gap-x-10 gap-y-4">
              <a
                href={`tel:${company.contact.phoneHref[0]}`}
                data-cursor=""
                className="group type-action flex items-center gap-3"
              >
                Bog‘lanish
                <span className="block h-px w-10 origin-left bg-bone transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
              </a>
              <Link to="/contact" data-cursor="" className="group type-action flex items-center gap-3 text-clay hover:text-bone">
                Manzil va ish vaqti
                <span className="block h-px w-10 origin-left bg-clay transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* related — bo'sh kelishi normal holat, blok shunchaki chiqmaydi */}
      {related.length > 0 && (
        <section className="relative z-10 edge py-[clamp(5rem,12vw,10rem)]">
          <div className="hairline flex items-baseline justify-between pt-4 text-charcoal">
            <span className="type-label text-clay">Shunga o‘xshash</span>
            <Link to="/catalog" data-cursor="" className="relative type-label text-clay before:absolute before:-inset-4 before:content-[''] hover:text-charcoal">
              Barchasi →
            </Link>
          </div>
          <div className="mt-[clamp(2.5rem,6vw,4rem)]">
            <ProductGrid items={related} />
          </div>
        </section>
      )}
    </>
  )
}

/**
 * Yuklanish holati. `RouteSkeleton` emas — u sahifa MODULI kelishini
 * kutadi va boshqa tartibda. Bu yerda tartib ma'lum: yorliq, sarlavha,
 * katta surat va yonida xususiyatlar ro'yxati, ya'ni kontent kelganda
 * sahifa sakramaydi.
 */
function ProductSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="relative z-10 edge pt-[clamp(7rem,16vw,13rem)]"
    >
      <span className="sr-only">Mahsulot yuklanmoqda</span>
      <span className="route-skeleton-bar" style={{ width: '9rem', height: '0.8125rem' }} aria-hidden />
      <span
        className="route-skeleton-bar mt-[clamp(2rem,6vw,4.5rem)]"
        style={{ width: 'min(70%, 40rem)', height: 'clamp(3rem, 6vw, 5.5rem)' }}
        aria-hidden
      />
      <div className="mt-[clamp(2.5rem,6vw,4rem)] grid gap-8 md:grid-cols-12">
        <span
          className="route-skeleton-bar md:col-span-9"
          style={{ aspectRatio: '16 / 10' }}
          aria-hidden
        />
        <div className="flex flex-col gap-6 md:col-span-3">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="route-skeleton-bar" style={{ height: '2.5rem' }} aria-hidden />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Xato holati (S-031 shu yerdan boshlanadi): oq ekran emas, tushunarli
 * xabar va qayta urinish. `ApiError` matni o'zbekcha va foydalanuvchiga
 * ko'rsatsa bo'ladigan qilib tayyorlangan (`api-error.js`).
 */
function ProductError({ error, onRetry }) {
  return (
    <section className="relative z-10 flex min-h-[70svh] flex-col justify-center edge py-[clamp(7rem,16vw,13rem)]">
      <span className="type-label text-clay">
        {error.isNetwork ? 'Aloqa yo‘q' : 'Xatolik'}
      </span>
      <h1 className="mt-8 max-w-[18ch] type-head">Mahsulotni ochib bo‘lmadi.</h1>
      <p className="mt-8 max-w-[44ch] text-clay">{error.message}</p>

      <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
        {error.isRetryable && (
          <button
            type="button"
            onClick={onRetry}
            data-cursor=""
            className="group type-action flex items-center gap-3"
          >
            Qayta urinish
            <span className="block h-px w-10 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
          </button>
        )}
        <Link to="/catalog" data-cursor="" className="group type-action flex items-center gap-3 text-clay hover:text-charcoal">
          Katalogga qaytish
          <span className="block h-px w-10 origin-left bg-clay transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
        </Link>
      </div>
    </section>
  )
}
