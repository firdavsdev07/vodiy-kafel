import { Link } from 'react-router-dom'

import SmartImage from '@/components/ui/SmartImage'
import { categoryName } from '@/data/categories'
import { featuredProducts } from '@/data/products'
import { useReveal } from '@/hooks/useReveal'

/** Project-scale presentation, not product cards. */
export default function CollectionsSection() {
  const ref = useReveal({ start: 'top 78%' })

  return (
    <section
      ref={ref}
      data-reveal=""
      className="relative z-10 bg-bone edge py-[clamp(6rem,15vw,13rem)]"
    >
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

      <div className="mt-[clamp(4rem,10vw,9rem)] flex flex-col gap-[clamp(4rem,9vw,8rem)]">
        {featuredProducts.map((product, i) => {
          const flipped = i % 2 === 1
          return (
            <article
              key={product.id}
              className={`grid items-end gap-6 md:grid-cols-12 md:gap-8 ${
                flipped ? 'md:[direction:rtl]' : ''
              }`}
            >
              <Link
                to={`/catalog/${product.slug}`}
                className={`group block md:[direction:ltr] ${
                  flipped ? 'md:col-span-7 md:col-start-6' : 'md:col-span-8'
                }`}
              >
                <SmartImage
                  id={product.image}
                  alt={product.name}
                  ratio={i % 3 === 0 ? '16 / 10' : '4 / 3'}
                  sizes="(max-width: 767px) 92vw, 60vw"
                  className="w-full"
                  imgClassName="transition-transform duration-[1600ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]"
                />
              </Link>

              <div
                className={`md:[direction:ltr] ${
                  flipped ? 'md:col-span-4 md:col-start-1 md:row-start-1' : 'md:col-span-3'
                }`}
              >
                <div className="r-fade flex items-baseline gap-4">
                  <span className="type-label text-clay">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="type-label text-clay">{product.collection}</span>
                </div>
                <h3 className="r-fade mt-4 type-sub">
                  <Link to={`/catalog/${product.slug}`}>
                    {product.name}
                  </Link>
                </h3>
                <dl className="r-fade mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-charcoal/15 pt-4">
                  <div>
                    <dt className="type-label text-clay">O‘lcham</dt>
                    <dd className="mt-1.5 type-meta">{product.size}</dd>
                  </div>
                  <div>
                    <dt className="type-label text-clay">Yuza</dt>
                    <dd className="mt-1.5 type-meta">{product.finish}</dd>
                  </div>
                  <div>
                    <dt className="type-label text-clay">Toifa</dt>
                    <dd className="mt-1.5 type-meta">
                      {categoryName(product.category)}
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
