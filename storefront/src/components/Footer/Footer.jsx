import { Link } from 'react-router-dom'

import { company } from '@/data/company'
import { useReveal } from '@/hooks/useReveal'

/**
 * The contact section is a designed page in its own right, not a footer
 * strip — see DESIGN.md §9.
 */
export default function Footer() {
  const ref = useReveal({ start: 'top 78%' })
  const year = new Date().getFullYear()

  return (
    <footer
      ref={ref}
      data-reveal=""
      className="relative overflow-hidden bg-ink text-bone"
    >
      <div className="edge pb-10 pt-[clamp(5rem,14vw,12rem)]">
        <div className="flex items-baseline justify-between">
          <span className="type-label text-clay">06 — Aloqa</span>
          <span className="type-label text-clay">{company.location}</span>
        </div>

        <h2 className="mt-[clamp(2.5rem,7vw,6rem)] type-display">
          <span className="line-mask">
            <span className="r-line">Biz bilan</span>
          </span>
          <span className="line-mask">
            <span className="r-line">bog‘laning.</span>
          </span>
        </h2>

        <div className="mt-[clamp(3rem,8vw,7rem)] grid gap-y-12 md:grid-cols-12 md:gap-x-8">
          <div className="md:col-span-7">
            <div className="type-label text-clay">Telefon</div>
            <div className="mt-5 flex flex-col gap-2">
              {company.contact.phones.map((phone, i) => (
                <a
                  key={phone}
                  href={`tel:${company.contact.phoneHref[i]}`}
                  data-cursor=""
                  className="line-mask group w-fit"
                >
                  <span className="r-line type-sub block transition-colors duration-500 group-hover:text-clay">
                    {phone}
                  </span>
                </a>
              ))}
            </div>

            <a
              href={`mailto:${company.contact.email}`}
              data-cursor=""
              className="r-fade mt-8 inline-block border-b border-bone/25 pb-1 text-[clamp(1rem,1.5vw,1.25rem)] transition-colors hover:border-bone/70 hover:text-clay"
            >
              {company.contact.email}
            </a>
          </div>

          <div className="r-fade md:col-span-3">
            <div className="type-label text-clay">Showroom</div>
            <address className="mt-5 not-italic leading-relaxed">
              {company.showroom.region}
              <br />
              {company.showroom.city} shahri
              <br />
              {company.showroom.street}
            </address>
            <div className="mt-6 type-label text-clay">Ish vaqti</div>
            <p className="mt-3 leading-relaxed">
              {company.showroom.hours}
              <br />
              <span className="text-clay">{company.showroom.days}</span>
              <br />
              <span className="text-clay">{company.showroom.closed}</span>
            </p>
          </div>

          <nav className="r-fade md:col-span-2">
            <div className="type-label text-clay">Indeks</div>
            <ul className="mt-5 flex flex-col gap-3">
              {company.nav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    data-cursor=""
                    className="group flex items-baseline gap-3 transition-colors hover:text-clay"
                  >
                    <span className="type-label text-clay">{item.index}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3">
              <a href={company.contact.telegram} target="_blank" rel="noreferrer" data-cursor="" className="type-label text-clay transition-colors hover:text-bone">
                Telegram ↗
              </a>
              <a href={company.contact.instagram} target="_blank" rel="noreferrer" data-cursor="" className="type-label text-clay transition-colors hover:text-bone">
                Instagram ↗
              </a>
            </div>
          </nav>
        </div>

        <div className="mt-[clamp(4rem,10vw,8rem)] flex flex-col gap-4 border-t border-bone/15 pt-6 md:flex-row md:items-center md:justify-between">
          <span className="type-label text-clay">
            © {year} {company.legalName}
          </span>
          <span className="type-label text-clay">{company.tagline}</span>
          <span className="type-label text-clay">{company.contact.handle}</span>
        </div>
      </div>
    </footer>
  )
}
