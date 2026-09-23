import { Link } from 'react-router-dom'

import { company } from '@/data/company'
import { useReveal } from '@/hooks/useReveal'
import { useMainBranch } from '@/shared/api'

/**
 * The contact section is a designed page in its own right, not a footer
 * strip — see DESIGN.md §9.
 */
export default function Footer() {
  const ref = useReveal({ start: 'top 78%' })
  const year = new Date().getFullYear()
  const { data: branch } = useMainBranch()

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
              {/* Touch target ≥44px (S-015): padding moved onto the `<a>`
                  itself (`-my-3`/`py-3` cancel out visually) — it can't
                  live on the same element as `line-mask`, whose own
                  `padding/margin-bottom` would collide with it, so the
                  reveal clip mask moved to a plain inner wrapper. */}
              {company.contact.phones.map((phone, i) => (
                <a
                  key={phone}
                  href={`tel:${company.contact.phoneHref[i]}`}
                  data-cursor=""
                  className="group -my-3 block w-fit py-3"
                >
                  <span className="line-mask block">
                    <span className="r-line type-sub block transition-colors duration-500 group-hover:text-clay">
                      {phone}
                    </span>
                  </span>
                </a>
              ))}
            </div>

            {/* Touch target ≥44px (S-015) — `py-2.5` replaces the old
                `pb-1`; `-my-2.5` cancels the layout shift so neighboring
                elements don't move. */}
            <a
              href={`mailto:${company.contact.email}`}
              data-cursor=""
              className="r-fade -my-2.5 mt-8 inline-block border-b border-bone/25 py-2.5 text-[clamp(1rem,1.5vw,1.25rem)] transition-colors hover:border-bone/70 hover:text-clay"
            >
              {company.contact.email}
            </a>
          </div>

          {/* Manzil API'dan (S-025) — ro'yxatdagi birinchi do'kon.
              Qaysi biri birinchi ekanini admin `sortOrder` bilan hal
              qiladi, sayt emas.

              Backend javob bermasa blok CHIQMAYDI — noto'g'ri manzil
              ko'rsatgandan ko'ra ko'rsatmagan afzal. Qo'ng'iroq qilish
              va yozish imkoni yo'qolmaydi: telefon, pochta va ijtimoiy
              tarmoqlar kompaniya darajasida, chap ustunda turadi. */}
          {branch && (
            <div className="r-fade md:col-span-3">
              <div className="type-label text-clay">Showroom</div>
              <address className="mt-5 not-italic leading-relaxed">
                {branch.city} shahri
                <br />
                {branch.address}
              </address>
              <div className="mt-6 type-label text-clay">Ish vaqti</div>
              <p className="mt-3 leading-relaxed">{branch.workingHours}</p>
            </div>
          )}

          <nav className="r-fade md:col-span-2">
            <div className="type-label text-clay">Indeks</div>
            <ul className="mt-5 flex flex-col gap-3">
              {company.nav.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    data-cursor=""
                    className="group -my-2.5 flex items-baseline gap-3 py-2.5 transition-colors hover:text-clay"
                  >
                    <span className="type-label text-clay">{item.index}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3">
              <a href={company.contact.telegram} target="_blank" rel="noreferrer" data-cursor="" className="-my-3.5 block py-3.5 type-action text-clay transition-colors hover:text-bone">
                Telegram ↗
              </a>
              <a href={company.contact.instagram} target="_blank" rel="noreferrer" data-cursor="" className="-my-3.5 block py-3.5 type-action text-clay transition-colors hover:text-bone">
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
