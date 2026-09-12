import { company } from '@/data/company'
import { useReveal } from '@/hooks/useReveal'

/**
 * Statistics treated as typography, occupying real estate — explicitly not
 * four cards in a row.
 */
export default function CompanySection() {
  const ref = useReveal({ start: 'top 80%', stagger: 0.08 })

  return (
    <section
      ref={ref}
      data-reveal=""
      className="relative z-10 bg-bone edge pb-[clamp(6rem,15vw,13rem)]"
    >
      <div className="flex items-baseline justify-between hairline pt-8 text-charcoal">
        <span className="type-label text-clay">05 — Kompaniya</span>
        <span className="type-label text-clay">
          {company.markets.import.join(' / ')}
        </span>
      </div>

      <div className="mt-[clamp(3rem,8vw,7rem)] flex flex-col">
        {company.stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex items-baseline justify-between gap-6 border-b border-charcoal/12 py-[clamp(1.5rem,3.5vw,3rem)] ${
              i % 2 === 1 ? 'md:pl-[16vw]' : ''
            }`}
          >
            <span className="line-mask">
              <span className="r-line type-display block">{stat.value}</span>
            </span>
            <span className="r-fade flex shrink-0 flex-col items-end text-right">
              <span className="type-label">{stat.label}</span>
              <span className="mt-1.5 type-label text-clay">{stat.en}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-[clamp(3rem,8vw,7rem)] grid gap-10 md:grid-cols-12">
        <div className="r-fade md:col-span-5">
          <p className="type-editorial">{company.story[1]}</p>
        </div>
        <div className="r-fade md:col-span-4 md:col-start-8">
          <div className="type-label text-clay">{company.guarantee.title}</div>
          <p className="mt-4 text-clay">{company.guarantee.body}</p>

          <div className="mt-10 type-label text-clay">Eksport</div>
          <p className="mt-4">{company.markets.export.join(', ')}</p>
          <p className="mt-2 text-clay">{company.markets.note}</p>
        </div>
      </div>
    </section>
  )
}
