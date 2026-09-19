import { Link, useParams } from 'react-router-dom'

import ProductGrid from '@/components/ui/ProductGrid'
import SmartImage from '@/components/ui/SmartImage'
import { categoryName } from '@/data/categories'
import { company } from '@/data/company'
import { productBySlug, relatedProducts } from '@/data/products'
import { useReveal } from '@/hooks/useReveal'
import NotFound from '@/pages/NotFound/NotFound'

export default function ProductDetail() {
  const { slug } = useParams()
  const product = productBySlug(slug)
  const headRef = useReveal({ start: 'top 92%', stagger: 0.07 })
  const bodyRef = useReveal({ start: 'top 82%' })
  const ctaRef = useReveal({ start: 'top 82%' })

  if (!product) return <NotFound />

  const related = relatedProducts(product, 3)
  const spec = [
    ['Kolleksiya', product.collection],
    ['O‘lcham', `${product.size} sm`],
    ['Yuza', product.finish],
    ['Qalinlik', product.thickness],
    ['Toifa', categoryName(product.category)],
    ['Tanlov', product.origin],
  ]

  return (
    <>
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
            {product.collection} / {product.year}
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
              id={product.image}
              alt={product.name}
              ratio="16 / 10"
              sizes="(max-width: 767px) 92vw, 72vw"
              width={2200}
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
          <p className="r-fade type-editorial md:col-span-7">{product.description}</p>
          <div className="r-fade md:col-span-4 md:col-start-9">
            <div className="type-label text-clay">Eslatma</div>
            <p className="mt-4 text-clay">
              Bu namuna kolleksiya: suratlar material yo‘nalishini ko‘rsatadi. Yakuniy
              tanlovni showroomda, tabiiy yorug‘likda qilishni tavsiya qilamiz.
            </p>
          </div>
        </div>

        {/* material study */}
        <div className="mt-[clamp(4rem,10vw,9rem)] grid gap-6 md:grid-cols-12 md:gap-8">
          {product.images.slice(1).map((id, i) => (
            <div
              key={`${id}-${i}`}
              className={
                i === 0
                  ? 'md:col-span-7'
                  : i === 1
                    ? 'md:col-span-5 md:mt-[6vw]'
                    : 'md:col-span-8 md:col-start-3'
              }
            >
              <SmartImage
                id={id}
                alt={`${product.name} — ${i + 1}`}
                ratio={i === 1 ? '3 / 4' : '4 / 3'}
                sizes="(max-width: 767px) 92vw, 58vw"
                className="w-full"
              />
              <div className="mt-3 type-label text-clay">
                {String(i + 1).padStart(2, '0')} — {i === 1 ? 'Struktura' : 'Interyerda'}
              </div>
            </div>
          ))}
        </div>
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
              {product.name} namunasi {company.showroom.city} showroomida mavjud.
              Kelishdan oldin qo‘ng‘iroq qiling — namunani tayyorlab qo‘yamiz.
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

      {/* related */}
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
