import { Link } from 'react-router-dom'

import { categories } from '@/data/categories'
import { useReveal } from '@/hooks/useReveal'

/** Treated as a designed page, not an error screen. */
export default function NotFound() {
  const ref = useReveal({ start: 'top 95%', stagger: 0.08 })

  return (
    <section
      ref={ref}
      data-reveal=""
      className="relative z-10 flex min-h-[100svh] flex-col justify-between edge pb-12 pt-[clamp(7rem,16vw,12rem)]"
    >
      <div className="flex items-baseline justify-between">
        <span className="type-label text-clay">Xato — 404</span>
        <span className="type-label text-clay">Sahifa topilmadi</span>
      </div>

      <div>
        <h1 className="type-display">
          <span className="line-mask">
            <span className="r-line">Bu yuza</span>
          </span>
          <span className="line-mask md:pl-[10vw]">
            <span className="r-line">mavjud emas.</span>
          </span>
        </h1>

        <p className="r-fade mt-10 max-w-[40ch] text-clay">
          So‘ralgan sahifa ko‘chirilgan yoki hech qachon bo‘lmagan. Katalogdan
          davom eting.
        </p>
      </div>

      <nav className="r-fade">
        <div className="hairline flex flex-wrap gap-x-8 gap-y-3 pt-6 text-charcoal">
          <Link to="/" data-cursor="" className="type-label hover:text-clay">
            Bosh sahifa
          </Link>
          <Link to="/catalog" data-cursor="" className="type-label hover:text-clay">
            Katalog
          </Link>
          {categories.slice(0, 4).map((c) => (
            <Link
              key={c.slug}
              to={`/categories/${c.slug}`}
              data-cursor=""
              className="type-label text-clay hover:text-charcoal"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </nav>
    </section>
  )
}
