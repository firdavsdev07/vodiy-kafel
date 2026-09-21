import { useState } from 'react'

import PageHeader from '@/components/ui/PageHeader'
import { useReveal } from '@/hooks/useReveal'
import { playTone } from '@/lib/sound'
import { ORDER_STATUS_LABEL, formatDateTime, trackModel, trackOrder } from '@/shared/api'
import Seo from '@/components/ui/Seo'

/**
 * Buyurtmani kuzatish (S-029) — `GET /orders/{orderNumber}/track`.
 *
 * Hisob kerak emas (G1: chakana mijozda hisob yo'q), lekin ochiq-oydin
 * ham emas: raqamdan tashqari egasining TELEFONI ham so'raladi.
 * Telefon mos kelmasa server "topilmadi" deydi — ya'ni raqamlarni
 * birma-bir sinab ko'rgan odam hech narsa bilib ololmaydi. Sayt shu
 * qoidani buzmaydi: "topilmadi" xabari ikkala holatda ham BIR XIL.
 *
 * 🔒 Ekranda faqat holat va vaqtlar. Summa, mahsulot ro'yxati va mijoz
 *    ma'lumoti — bu yerda ham, javobda ham yo'q.
 */

/** Yetkazib berish yo'li (`api/docs/enums.md`). Olib ketishda `SEARCHING_TRANSPORT` bo'lmaydi. */
const DELIVERY_FLOW = ['NEW', 'SEARCHING_TRANSPORT', 'LOADING', 'DELIVERING', 'DELIVERED']

export default function Track() {
  const [values, setValues] = useState({ orderNumber: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [failure, setFailure] = useState(null)

  const update = (field) => (event) => {
    setValues((v) => ({ ...v, [field]: event.target.value }))
    setErrors((v) => ({ ...v, [field]: undefined }))
  }

  const validate = () => {
    const next = {}
    if (values.orderNumber.trim().length < 4) next.orderNumber = 'Buyurtma raqamini kiriting'
    if (values.phone.replace(/\D/g, '').length < 9) next.phone = 'Telefon raqamini kiriting'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (status === 'sending') return
    if (!validate()) return

    setStatus('sending')
    setFailure(null)
    setResult(null)
    playTone('click')

    try {
      const data = await trackOrder(values.orderNumber, values.phone)
      setResult(trackModel(data))
      setStatus('done')
      playTone('open')
    } catch (error) {
      /* 404 — buyurtma yo'q YOKI telefon mos kelmadi. Ikkalasi ataylab
         farqlanmaydi, shuning uchun xabar ham bitta. */
      setFailure(
        error.isNotFound
          ? 'Bunday buyurtma topilmadi. Raqam va telefonni tekshirib, qayta urinib ko‘ring.'
          : error.message,
      )
      setStatus('idle')
    }
  }

  const field =
    'w-full border-b border-charcoal/25 bg-transparent py-4 text-[clamp(1.05rem,1.6vw,1.3rem)] outline-none transition-colors placeholder:text-clay focus:border-charcoal'

  return (
    <>
      <Seo
        title="Buyurtmani kuzatish"
        description="Buyurtma raqami va telefon orqali yetkazib berish holatini tekshiring."
        noindex
      />

      <PageHeader
        /* Menyudagi raqamli tartibga KIRMAYDI (`company.nav`) —
           bu yordamchi sahifa, footerdan topiladi. */
        eyebrow="Buyurtmani kuzatish"
        title={['Buyurtma', 'qayerda?']}
        lede="Buyurtma raqami va buyurtma berilgan telefon raqamini kiriting. Hisob ochish shart emas."
      />

      <Body>
        <div className="grid gap-y-16 md:grid-cols-12 md:gap-x-8">
          <div className="md:col-span-5">
            <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
              <div>
                <label htmlFor="orderNumber" className="type-label text-clay">
                  Buyurtma raqami
                </label>
                <input
                  id="orderNumber"
                  name="orderNumber"
                  value={values.orderNumber}
                  onChange={update('orderNumber')}
                  placeholder="VK-2026-000001"
                  autoComplete="off"
                  spellCheck="false"
                  aria-invalid={Boolean(errors.orderNumber)}
                  className={field}
                />
                {errors.orderNumber && (
                  <p className="mt-2 type-label text-clay">{errors.orderNumber}</p>
                )}
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
                <p className="mt-3 type-label max-w-[38ch] leading-relaxed text-clay">
                  Buyurtma qaysi raqamga rasmiylashtirilgan bo‘lsa, o‘sha raqam.
                </p>
              </div>

              {/* Touch target ≥44px (S-015) — `gap-8` atrofida joy bor. */}
              <button
                type="submit"
                data-cursor=""
                disabled={status === 'sending'}
                className="group relative mt-2 flex w-fit items-center gap-4 type-label before:absolute before:-inset-4 before:content-[''] disabled:opacity-40"
              >
                {status === 'sending' ? 'Qidirilmoqda' : 'Holatni ko‘rish'}
                <span className="block h-px w-14 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[1.714]" />
              </button>

              {failure && (
                <p role="alert" className="max-w-[40ch] leading-relaxed text-clay">
                  {failure}
                </p>
              )}
            </form>
          </div>

          <div className="md:col-span-6 md:col-start-7">
            {result ? <Result result={result} /> : <Hint />}
          </div>
        </div>
      </Body>
    </>
  )
}

function Body({ children }) {
  const ref = useReveal({ start: 'top 88%' })
  return (
    <section
      ref={ref}
      data-reveal=""
      className="relative z-10 edge pb-[clamp(5rem,12vw,10rem)]"
    >
      <div className="r-fade">{children}</div>
    </section>
  )
}

/** Natija kelguncha o'ng ustun bo'sh qolmasin. */
function Hint() {
  return (
    <div className="border-t border-charcoal/12 pt-6">
      <div className="type-label text-clay">Bosqichlar</div>
      <ol className="mt-5 flex flex-col gap-3">
        {DELIVERY_FLOW.map((key, i) => (
          <li key={key} className="flex items-baseline gap-4 text-clay">
            <span className="type-label">{String(i + 1).padStart(2, '0')}</span>
            <span>{ORDER_STATUS_LABEL[key]}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 type-label max-w-[40ch] leading-relaxed text-clay">
        Olib ketishda «Mashina qidirilmoqda» va «Yetkazib berilmoqda» bosqichlari
        bo‘lmaydi.
      </p>
    </div>
  )
}

function Result({ result }) {
  return (
    <div className="border-t border-charcoal/25 pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="type-label text-clay">{result.orderNumber}</span>
        <span className="type-label text-clay">{formatDateTime(result.createdAt)}</span>
      </div>

      <p className="mt-6 text-[clamp(1.4rem,3vw,2.2rem)] font-semibold leading-none tracking-[-0.03em]">
        {result.statusLabel}
      </p>

      {result.regionName ? (
        <p className="mt-5 text-clay">Yetkazib berish: {result.regionName}</p>
      ) : (
        // `regionName: null` — yetkazib berish yo'q, mijoz o'zi oladi.
        <p className="mt-5 text-clay">Olib ketish — filialdan</p>
      )}

      {result.isCancelled && (
        <p className="mt-5 max-w-[40ch] leading-relaxed text-clay">
          Buyurtma bekor qilingan. Savol bo‘lsa menejeringizga murojaat qiling.
        </p>
      )}

      <div className="mt-10 type-label text-clay">Tarix</div>
      <ol className="mt-5 flex flex-col">
        {result.history.map((entry, i) => (
          <li
            key={`${entry.status}-${entry.createdAt}`}
            className="flex items-baseline justify-between gap-4 border-t border-charcoal/12 py-4"
          >
            <span className={i === 0 ? 'font-semibold' : 'text-clay'}>{entry.label}</span>
            <span className="type-label text-clay">{formatDateTime(entry.createdAt)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
