import SmartImage from '@/components/ui/SmartImage'
import { company } from '@/data/company'
import { INTERIOR } from '@/data/images'
import { useReveal } from '@/hooks/useReveal'
import { branchModel, useBranches, usePaymentRequisites } from '@/shared/api'
import Seo from '@/components/ui/Seo'

export default function Contact() {
  const headRef = useReveal({ start: 'top 92%', stagger: 0.08 })
  const bodyRef = useReveal({ start: 'top 85%' })

  return (
    <>
      <Seo
        title="Aloqa"
        description="Vodiy Kafel do‘konlari: manzil, ish vaqti va telefon raqamlari. Farg‘ona, Andijon, Namangan, Qo‘qon."
      />

      <header
        ref={headRef}
        data-reveal=""
        className="relative z-10 edge pb-[clamp(3rem,7vw,6rem)] pt-[clamp(7rem,16vw,13rem)]"
      >
        <div className="flex items-baseline justify-between">
          <span className="type-label text-clay">06 — Aloqa</span>
          <span className="type-label text-clay">{company.location}</span>
        </div>

        <h1 className="mt-[clamp(2rem,6vw,4.5rem)] type-display">
          <span className="line-mask">
            <span className="r-line">Salom</span>
          </span>
          <span className="line-mask md:pl-[14vw]">
            <span className="r-line">deying.</span>
          </span>
        </h1>
      </header>

      <section
        ref={bodyRef}
        data-reveal=""
        className="relative z-10 edge pb-[clamp(5rem,12vw,10rem)]"
      >
        <div className="grid gap-y-16 md:grid-cols-12 md:gap-x-8">
          {/* details */}
          <div className="md:col-span-5">
            <div className="r-fade">
              <div className="type-label text-clay">Telefon</div>
              {/* Touch target ≥44px (S-015): `-my-3`/`py-3` cancel out
                  visually; `gap-2` between phone links is real flex gap,
                  unaffected by each link's own padding, so no overlap. */}
              <div className="mt-4 flex flex-col gap-2">
                {company.contact.phones.map((phone, i) => (
                  <a
                    key={phone}
                    href={`tel:${company.contact.phoneHref[i]}`}
                    className="-my-3 block py-3 text-[clamp(1.4rem,3vw,2.4rem)] font-semibold leading-none tracking-[-0.03em] transition-colors hover:text-clay"
                  >
                    {phone}
                  </a>
                ))}
              </div>
            </div>

            {/* Touch target ≥44px (S-015): real padding, not an expanded
                `::before` — this row wraps on narrow screens, and an
                inset large enough to reach 44px would overlap the row
                below it; padding grows each link's own box instead, so
                wrapped rows space apart automatically. */}
            <div className="r-fade mt-12 flex flex-wrap gap-x-8 gap-y-3">
              <a href={`mailto:${company.contact.email}`} className="-my-3.5 inline-block border-b border-charcoal/25 py-3.5 type-label hover:border-charcoal">
                {company.contact.email}
              </a>
              <a href={company.contact.telegram} target="_blank" rel="noreferrer" className="-my-4 inline-block py-4 type-label text-clay hover:text-charcoal">
                Telegram ↗
              </a>
              <a href={company.contact.instagram} target="_blank" rel="noreferrer" className="-my-4 inline-block py-4 type-label text-clay hover:text-charcoal">
                Instagram ↗
              </a>
            </div>

            <div className="r-fade mt-12">
              <SmartImage
                id={INTERIOR[9]}
                alt=""
                ratio="16 / 9"
                sizes="(max-width: 767px) 92vw, 40vw"
                className="w-full"
              />
            </div>
          </div>

          {/* Aloqa yo'llari (S-030).

              ⚠ FORMA OLIB TASHLANDI. U ochiq-oydin "demo rejimida —
                ma'lumot hech qayerga yuborilmaydi" deb yozib turardi.
                Backendda ochiq "murojaat/lead" endpointi YO'Q:
                `POST /orders` faqat optom mijoz tokeni bilan ishlaydi,
                chakana mijozda esa hisob yo'q (G1). Ishlamaydigan
                forma ishonchni yo'qotadi — odam yozadi, javob kelmaydi.

              🆕 Keyingi qadam — api'da `POST /leads` (task.txt, S-030
                 dagi "A yo'li"). U tayyor bo'lgach forma shu yerga
                 qaytadi. */}
          <div className="md:col-span-6 md:col-start-7">
            <div className="r-fade type-label text-clay">Qanday bog‘lanish mumkin</div>

            <div className="r-fade mt-8 flex flex-col">
              {company.contact.phones.map((phone, i) => (
                <a
                  key={phone}
                  href={`tel:${company.contact.phoneHref[i]}`}
                  className="group flex items-baseline justify-between gap-4 border-t border-charcoal/25 py-5 transition-colors hover:text-clay"
                >
                  <span className="type-label text-clay">
                    {i === 0 ? 'Qo‘ng‘iroq' : 'Qo‘shimcha'}
                  </span>
                  <span className="text-[clamp(1.1rem,2vw,1.6rem)] font-semibold tracking-[-0.02em]">
                    {phone}
                  </span>
                </a>
              ))}

              <a
                href={company.contact.telegram}
                target="_blank"
                rel="noreferrer"
                className="group flex items-baseline justify-between gap-4 border-t border-charcoal/25 py-5 transition-colors hover:text-clay"
              >
                <span className="type-label text-clay">Telegram</span>
                <span className="text-[clamp(1.1rem,2vw,1.6rem)] font-semibold tracking-[-0.02em]">
                  {company.contact.handle} ↗
                </span>
              </a>

              <a
                href={`mailto:${company.contact.email}`}
                className="group flex items-baseline justify-between gap-4 border-y border-charcoal/25 py-5 transition-colors hover:text-clay"
              >
                <span className="type-label text-clay">Pochta</span>
                <span className="break-all text-[clamp(0.95rem,1.5vw,1.2rem)]">
                  {company.contact.email}
                </span>
              </a>
            </div>

            <p className="r-fade mt-8 max-w-[42ch] leading-relaxed text-clay">
              Qo‘ng‘iroq qiling yoki Telegramga yozing — ish vaqtida darhol
              javob beramiz. Qaysi yuza kerakligini bilmasangiz ham bo‘ladi:
              xonani aytsangiz, o‘zimiz tanlab beramiz.
            </p>
          </div>
        </div>
      </section>

      <BranchList />
      <Requisites />
    </>
  )
}

/**
 * Do'konlar ro'yxati (S-025) — `GET /branches`.
 *
 * ⚠ Bu yerda kelgan hammasi — odam borib ko'ra oladigan do'kon.
 *   Markaziy ombor ochiq endpointda UMUMAN yo'q, ya'ni saytda
 *   "filial turi" degan tushuncha ham yo'q (api/CLAUDE.md §5).
 */
function BranchList() {
  const ref = useReveal({ start: 'top 85%' })
  const { data, error, refetch } = useBranches()
  const branches = (data ?? []).map(branchModel)

  // Hech narsa yo'q va xato ham yo'q — hali yuklanmoqda.
  if (!branches.length && !error) return <BranchListSkeleton />

  return (
    <section
      ref={ref}
      data-reveal=""
      className="relative z-10 edge pb-[clamp(5rem,12vw,10rem)]"
    >
      <div className="hairline flex items-baseline justify-between pt-4">
        <span className="type-label text-clay">Do‘konlar</span>
        {branches.length > 0 && (
          <span className="type-label text-clay">
            {String(branches.length).padStart(2, '0')} ta manzil
          </span>
        )}
      </div>

      {error ? (
        <div className="mt-[clamp(2.5rem,6vw,4rem)]">
          <p className="max-w-[44ch] text-clay">{error.message}</p>
          {error.isRetryable && (
            <button
              type="button"
              onClick={refetch}
              className="group mt-8 flex items-center gap-3 type-action"
            >
              Qayta urinish
              <span className="block h-px w-10 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
            </button>
          )}
        </div>
      ) : (
        <div className="mt-[clamp(2.5rem,6vw,4rem)] grid gap-x-8 gap-y-[clamp(2.5rem,5vw,4rem)] md:grid-cols-2 lg:grid-cols-4">
          {branches.map((branch) => (
            <article key={branch.id} className="r-fade border-t border-charcoal/12 pt-5">
              <h2 className="text-[clamp(1.1rem,1.8vw,1.55rem)] font-semibold leading-none tracking-[-0.02em]">
                {branch.city}
              </h2>

              <address className="mt-4 not-italic leading-relaxed text-clay">
                {branch.address}
              </address>

              <p className="mt-4 type-meta">{branch.workingHours}</p>

              {/* Touch target ≥44px (S-015): `-my-2.5`/`py-2.5` — qator
                  kattalashadi, lekin qo'shni elementlar joyidan siljimaydi. */}
              <div className="mt-4 flex flex-col">
                {branch.phones.map((phone) => (
                  <a
                    key={phone.href}
                    href={`tel:${phone.href}`}
                    className="-my-2.5 block py-2.5 transition-colors hover:text-clay"
                  >
                    {phone.display}
                  </a>
                ))}
              </div>

              {branch.mapUrl && (
                <a
                  href={branch.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group mt-6 flex items-center gap-3 type-action"
                >
                  Xaritada ochish
                  <span className="block h-px w-8 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

/** Ro'yxat kelguncha — o'sha tartib, saytning o'z ohangida (S-031). */
function BranchListSkeleton() {
  return (
    <section
      role="status"
      aria-live="polite"
      className="relative z-10 edge pb-[clamp(5rem,12vw,10rem)]"
    >
      <span className="sr-only">Do‘konlar ro‘yxati yuklanmoqda</span>
      <div className="hairline pt-4">
        <span className="type-label text-clay" aria-hidden>Do‘konlar</span>
      </div>
      <div className="mt-[clamp(2.5rem,6vw,4rem)] grid gap-x-8 gap-y-[clamp(2.5rem,5vw,4rem)] md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-3 border-t border-charcoal/12 pt-5" aria-hidden>
            <span className="route-skeleton-bar" style={{ width: '45%', height: '1.3rem' }} />
            <span className="route-skeleton-bar" style={{ width: '80%', height: '1rem' }} />
            <span className="route-skeleton-bar" style={{ width: '70%', height: '1rem' }} />
            <span className="route-skeleton-bar" style={{ width: '60%', height: '1rem' }} />
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Bank rekvizitlari (S-028) — `GET /settings/public`.
 *
 * ❓ Taskdagi savol: "saytda kerakmi?". Javob — HA, chunki qaror
 *    saytniki emas: backend bu kalitni faqat admin `isPublic` deb
 *    belgilagandagina chiqaradi. Ya'ni "ko'rsatilsinmi" degan savolga
 *    admin panelining o'zi javob beradi, sayt esa bor narsani
 *    ko'rsatadi va yo'q bo'lsa jim turadi.
 *
 * 🔒 Bu to'lov QABUL QILISH emas: ochiq saytda savat ham, to'lov ham
 *    yo'q (G1). Bu shunchaki pul ko'chirish uchun kerakli ma'lumot —
 *    ko'pincha shartnoma bo'yicha ishlaydigan mijozga.
 */
function Requisites() {
  const ref = useReveal({ start: 'top 88%' })
  const { data } = usePaymentRequisites()

  // Kalit ochilmagan yoki hali to'ldirilmagan — blok umuman chiqmaydi.
  if (!data) return null

  const rows = [
    ['Nomi', data.name],
    ['Bank', data.bank],
    ['Hisob raqami', data.account],
    ['MFO', data.mfo],
    ['INN', data.inn],
  ].filter(([, value]) => value)

  return (
    <section
      ref={ref}
      data-reveal=""
      className="relative z-10 edge pb-[clamp(5rem,12vw,10rem)]"
    >
      <div className="hairline flex items-baseline justify-between pt-4">
        <span className="type-label text-clay">Rekvizitlar</span>
        <span className="type-label text-clay">Pul ko‘chirish uchun</span>
      </div>

      <dl className="r-fade mt-[clamp(2rem,5vw,3rem)] grid gap-x-8 gap-y-6 md:grid-cols-3 lg:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label} className="border-t border-charcoal/12 pt-3">
            <dt className="type-label text-clay">{label}</dt>
            {/* Hisob raqami uzun va ko'chiriladi — `break-all` bo'lmasa
                tor ekranda qutidan chiqib ketadi. */}
            <dd className="mt-2 type-meta break-all">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
