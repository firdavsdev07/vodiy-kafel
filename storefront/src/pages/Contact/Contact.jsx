import { useState } from 'react'

import SmartImage from '@/components/ui/SmartImage'
import { company } from '@/data/company'
import { INTERIOR } from '@/data/images'
import { useReveal } from '@/hooks/useReveal'
import { submitEnquiry } from '@/lib/enquiry'
import { playTone } from '@/lib/sound'

const EMPTY = { name: '', phone: '', message: '' }

export default function Contact() {
  const headRef = useReveal({ start: 'top 92%', stagger: 0.08 })
  const bodyRef = useReveal({ start: 'top 85%' })

  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [reference, setReference] = useState(null)

  const update = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    setErrors((v) => ({ ...v, [field]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (values.name.trim().length < 2) next.name = 'Ismingizni kiriting'
    if (values.phone.replace(/\D/g, '').length < 9) next.phone = 'Telefon raqamini kiriting'
    if (values.message.trim().length < 4) next.message = 'Qisqacha yozing'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  /* No API call — see src/lib/enquiry.js */
  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return
    if (!validate()) return

    setStatus('sending')
    playTone('click')
    const result = await submitEnquiry(values)
    if (result.ok) {
      setReference(result.reference)
      setStatus('sent')
      setValues(EMPTY)
      playTone('open')
    } else {
      setStatus('idle')
    }
  }

  const field =
    'w-full border-b border-charcoal/25 bg-transparent py-4 text-[clamp(1.05rem,1.6vw,1.3rem)] outline-none transition-colors placeholder:text-clay focus:border-charcoal'

  return (
    <>
      <header
        ref={headRef}
        data-reveal=""
        className="relative z-10 edge pb-[clamp(3rem,7vw,6rem)] pt-[clamp(7rem,16vw,13rem)]"
      >
        <div className="flex items-baseline justify-between">
          <span className="type-label text-clay">05 — Aloqa</span>
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
                    data-cursor=""
                    className="-my-3 block py-3 text-[clamp(1.4rem,3vw,2.4rem)] font-semibold leading-none tracking-[-0.03em] transition-colors hover:text-clay"
                  >
                    {phone}
                  </a>
                ))}
              </div>
            </div>

            <div className="r-fade mt-12">
              <div className="type-label text-clay">Manzil</div>
              <address className="mt-4 not-italic leading-relaxed">
                {company.showroom.region}
                <br />
                {company.showroom.city} shahri
                <br />
                {company.showroom.street}
                <br />
                <span className="text-clay">{company.showroom.landmark}</span>
              </address>
            </div>

            <div className="r-fade mt-12">
              <div className="type-label text-clay">Ish vaqti</div>
              <p className="mt-4 leading-relaxed">
                {company.showroom.hours}
                <br />
                {company.showroom.days}
                <br />
                <span className="text-clay">{company.showroom.closed}</span>
              </p>
            </div>

            {/* Touch target ≥44px (S-015): real padding, not an expanded
                `::before` — this row wraps on narrow screens, and an
                inset large enough to reach 44px would overlap the row
                below it; padding grows each link's own box instead, so
                wrapped rows space apart automatically. */}
            <div className="r-fade mt-12 flex flex-wrap gap-x-8 gap-y-3">
              <a href={`mailto:${company.contact.email}`} data-cursor="" className="-my-3.5 inline-block border-b border-charcoal/25 py-3.5 type-label hover:border-charcoal">
                {company.contact.email}
              </a>
              <a href={company.contact.telegram} target="_blank" rel="noreferrer" data-cursor="" className="-my-4 inline-block py-4 type-label text-clay hover:text-charcoal">
                Telegram ↗
              </a>
              <a href={company.contact.instagram} target="_blank" rel="noreferrer" data-cursor="" className="-my-4 inline-block py-4 type-label text-clay hover:text-charcoal">
                Instagram ↗
              </a>
            </div>

            <a
              href={company.showroom.mapUrl}
              target="_blank"
              rel="noreferrer"
              data-cursor="Ochish"
              className="r-fade mt-12 block"
            >
              <SmartImage
                id={INTERIOR[9]}
                alt="Showroom joylashuvi"
                ratio="16 / 9"
                sizes="(max-width: 767px) 92vw, 40vw"
                className="w-full"
                imgClassName="transition-transform duration-[1400ms] ease-[cubic-bezier(.16,1,.3,1)] hover:scale-[1.04]"
              />
              <span className="mt-3 block type-action text-clay">Xaritada ko‘rish →</span>
            </a>
          </div>

          {/* form */}
          <div className="md:col-span-6 md:col-start-7">
            <div className="r-fade type-label text-clay">Xabar qoldiring</div>

            {status === 'sent' ? (
              <div className="mt-8 border-t border-charcoal/25 pt-8">
                <p className="type-sub">Qabul qilindi.</p>
                <p className="mt-5 max-w-[38ch] text-clay">
                  Menejerimiz ish vaqti davomida siz bilan bog‘lanadi. Shoshilinch
                  bo‘lsa, to‘g‘ridan-to‘g‘ri qo‘ng‘iroq qiling.
                </p>
                <p className="mt-6 type-label text-clay">Ma’lumotnoma: {reference}</p>
                <button
                  type="button"
                  data-cursor=""
                  onClick={() => setStatus('idle')}
                  className="group relative mt-10 inline-flex items-center gap-3 type-label before:absolute before:-inset-4 before:content-['']"
                >
                  Yana yozish
                  <span className="h-px w-10 bg-charcoal transition-[width] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:w-20" />
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-8">
                <div>
                  <label htmlFor="name" className="type-label text-clay">
                    Ism
                  </label>
                  <input
                    id="name"
                    name="name"
                    value={values.name}
                    onChange={update('name')}
                    placeholder="Ismingiz"
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                    className={field}
                  />
                  {errors.name && <p className="mt-2 type-label text-clay">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="type-label text-clay">
                    Telefon
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    value={values.phone}
                    onChange={update('phone')}
                    placeholder="+998 __ ___ __ __"
                    autoComplete="tel"
                    aria-invalid={Boolean(errors.phone)}
                    className={field}
                  />
                  {errors.phone && <p className="mt-2 type-label text-clay">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="message" className="type-label text-clay">
                    Xabar
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={values.message}
                    onChange={update('message')}
                    placeholder="Qaysi yuza qiziqtiradi, qancha m² kerak?"
                    aria-invalid={Boolean(errors.message)}
                    className={`${field} resize-none`}
                  />
                  {errors.message && (
                    <p className="mt-2 type-label text-clay">{errors.message}</p>
                  )}
                </div>

                {/* Touch target ≥44px (S-015) — the primary form CTA was
                    only 15px tall. `gap-8` on the form's flex column gives
                    16px of clearance on each side to expand into safely. */}
                <button
                  type="submit"
                  data-cursor=""
                  disabled={status === 'sending'}
                  className="group relative mt-2 flex w-fit items-center gap-4 type-label before:absolute before:-inset-4 before:content-[''] disabled:opacity-40"
                >
                  {status === 'sending' ? 'Yuborilmoqda' : 'Yuborish'}
                  <span className="h-px w-14 bg-charcoal transition-[width] duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:w-24" />
                </button>

                <p className="type-label max-w-[40ch] leading-relaxed text-clay">
                  Bu forma hozircha demo rejimida — ma’lumot hech qayerga
                  yuborilmaydi.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
