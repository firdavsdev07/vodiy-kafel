import { Link } from 'react-router-dom'

import SmartImage from '@/components/ui/SmartImage'
import { playTone } from '@/lib/sound'

/**
 * Shared product listing. Alternating ratios keep the rows from reading as cards.
 *
 * `items` — `productCardModel` shakli (API). Mahalliy mock katalogning
 * `image`/`category` shoxlari T-012 da mock bilan birga ketdi.
 */
export default function ProductGrid({ items, columns = 3, startIndex = 0 }) {
  const cols =
    columns === 2
      ? 'md:grid-cols-2'
      : columns === 4
        ? 'md:grid-cols-2 lg:grid-cols-4'
        : 'md:grid-cols-2 lg:grid-cols-3'

  return (
    <div className={`grid grid-cols-1 gap-x-8 gap-y-[clamp(2.5rem,6vw,5rem)] ${cols}`}>
      {items.map((product, i) => (
        <article key={product.id} className={i % 3 === 1 ? 'lg:mt-[5vw]' : ''}>
          <Link
            to={`/catalog/${product.slug}`}
            onClick={() => playTone('click')}
            className="group block"
          >
            <SmartImage
              src={product.src}
              alt={product.name}
              ratio={i % 4 === 0 ? '4 / 5' : '3 / 4'}
              sizes="(max-width: 767px) 92vw, (max-width: 1023px) 46vw, 30vw"
              className="w-full"
              imgClassName="transition-transform duration-[1500ms] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.055]"
            />
            <div className="mt-4 border-t border-current/12 pt-4">
              <div className="type-label opacity-60">
                {String(startIndex + i + 1).padStart(2, '0')} / {product.collection}
              </div>
              <h3 className="mt-3 text-[clamp(1.1rem,1.8vw,1.55rem)] font-semibold leading-none tracking-[-0.02em]">
                {product.name}
              </h3>
              <div className="mt-3 flex items-baseline justify-between gap-4 type-meta">
                <span className="opacity-60">
                  {product.categoryLabel}
                </span>
                <span>
                  {product.size} · {product.finish}
                </span>
              </div>
            </div>
          </Link>
        </article>
      ))}
    </div>
  )
}
