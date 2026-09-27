import { useState } from 'react'

import { playTone } from '@/lib/sound'
import { LEAD_LIMITS, branchModel, submitLead, useBranches, validateLead } from '@/shared/api'

const EMPTY = { name: '', phone: '', message: '', branchId: '', website: '' }

const field =
  'w-full border-b border-charcoal/25 bg-transparent py-4 text-[clamp(1.05rem,1.6vw,1.3rem)] outline-none transition-colors placeholder:text-clay focus:border-charcoal aria-[invalid=true]:border-clay'

/**
 * Aloqa formasi (T-013) — `POST /leads`. S-030 da olib tashlangan edi
 * ("demo rejimida — hech qayerga yuborilmaydi"); endi xabar admin
 * panelga tushadi va xodim qo'ng'iroq qiladi.
 *
 * Mehmonning hisobi yo'q (G1) — bu buyurtma emas, faqat iltimos.
 */
export default function ContactForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [serverError, setServerError] = useState(null)
  const [reference, setReference] = useState(null)
  const branches = (useBranches().data ?? []).map(branchModel)

  const update = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    setErrors((v) => ({ ...v, [key]: undefined }))
    setServerError(null)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'sending') return

    const next = validateLead(values)
    setErrors(next)
    if (Object.keys(next).length) return

    setStatus('sending')
    setServerError(null)
    playTone('click')
    try {
      const result = await submitLead(values)
      setReference(result?.reference ?? null)
      setStatus('sent')
      setValues(EMPTY)
      playTone('open')
    } catch (error) {
      // Server matni o'zbekcha (validatsiya, 429, tarmoq — `ApiError`).
      setServerError(error?.message || 'Yuborib bo‘lmadi. Qo‘ng‘iroq qiling.')
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="mt-8 border-t border-charcoal/25 pt-8">
        <p className="type-sub">Qabul qilindi.</p>
        <p className="mt-5 max-w-[38ch] text-clay">
          Menejerimiz ish vaqti davomida siz bilan bog‘lanadi. Shoshilinch
          bo‘lsa, to‘g‘ridan-to‘g‘ri qo‘ng‘iroq qiling.
        </p>
        {reference && <p className="mt-6 type-label text-clay">Ma’lumotnoma: {reference}</p>}
        <button
          type="button"
          data-cursor=""
          onClick={() => setStatus('idle')}
          className="group relative mt-10 inline-flex items-center gap-3 type-label before:absolute before:-inset-4 before:content-['']"
        >
          Yana yozish
          <span className="block h-px w-10 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[1.6]" />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-8">
      <div>
        <label htmlFor="lead-name" className="type-label text-clay">
          Ism
        </label>
        <input
          id="lead-name"
          name="name"
          value={values.name}
          onChange={update('name')}
          placeholder="Ismingiz"
          autoComplete="name"
          maxLength={LEAD_LIMITS.name}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'lead-name-error' : undefined}
          className={field}
        />
        {errors.name && <p id="lead-name-error" className="mt-2 type-label text-clay">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="lead-phone" className="type-label text-clay">
          Telefon
        </label>
        <input
          id="lead-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          value={values.phone}
          onChange={update('phone')}
          placeholder="+998 __ ___ __ __"
          autoComplete="tel"
          maxLength={25}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'lead-phone-error' : undefined}
          className={field}
        />
        {errors.phone && <p id="lead-phone-error" className="mt-2 type-label text-clay">{errors.phone}</p>}
      </div>

      {/* Do'kon — ixtiyoriy. Tanlansa murojaat o'sha do'kon xodimiga
          tushadi; tanlanmasa — markazga. Ro'yxat kelmasa maydon yo'q. */}
      {branches.length > 1 && (
        <div>
          <label htmlFor="lead-branch" className="type-label text-clay">
            Qaysi do‘kon yaqinroq
          </label>
          <select
            id="lead-branch"
            name="branchId"
            value={values.branchId}
            onChange={update('branchId')}
            className={`${field} cursor-pointer appearance-none`}
          >
            <option value="">Farqi yo‘q</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.city}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="lead-message" className="type-label text-clay">
          Xabar
        </label>
        <textarea
          id="lead-message"
          name="message"
          rows={4}
          value={values.message}
          onChange={update('message')}
          placeholder="Qaysi yuza qiziqtiradi, qancha m² kerak?"
          maxLength={LEAD_LIMITS.message}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'lead-message-error' : undefined}
          className={`${field} resize-none`}
        />
        {errors.message && <p id="lead-message-error" className="mt-2 type-label text-clay">{errors.message}</p>}
      </div>

      {/* 🔒 Bot tuzog'i: odam ko'rmaydi (ekrandan tashqarida, Tab bilan
          ham kirilmaydi), forma to'ldiruvchi bot esa hamma maydonni
          yozadi. To'lgan so'rovni server jimgina tashlaydi.
          `display:none` EMAS — ba'zi botlar yashirin maydonni o'tkazib
          yuboradi. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="lead-website">Sayt</label>
        <input
          id="lead-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={update('website')}
        />
      </div>

      {/* Touch target ≥44px (S-015) — `gap-8` gives room for the inset. */}
      <button
        type="submit"
        data-cursor=""
        disabled={status === 'sending'}
        className="group relative mt-2 flex w-fit items-center gap-4 type-label before:absolute before:-inset-4 before:content-[''] disabled:opacity-40"
      >
        {status === 'sending' ? 'Yuborilmoqda' : 'Yuborish'}
        <span className="block h-px w-14 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[1.714]" />
      </button>

      {serverError && (
        <p role="alert" className="max-w-[40ch] leading-relaxed text-clay">
          {serverError}
        </p>
      )}
    </form>
  )
}
