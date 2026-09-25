import { Component } from 'react'

/**
 * Xato chegarasi (S-043).
 *
 * Maqsad: BITTA komponent yiqilsa butun sayt oq ekran bo'lib
 * qolmasin. React'da ushlanmagan render xatosi butun daraxtni
 * yechib tashlaydi — natijada odam bo'm-bo'sh sahifani ko'radi va
 * nima bo'lganini bilmaydi.
 *
 * ⚠ Sinf komponenti ATAYLAB: `componentDidCatch` va
 *   `getDerivedStateFromError` hook ko'rinishida YO'Q. React jamoasi
 *   hali funksional muqobilini bermagan, shuning uchun bu — kutubxona
 *   qo'shmasdan mavjud yagona yo'l.
 *
 * ⚠ NIMANI USHLAMAYDI: hodisa ishlovchilaridagi (`onClick`), `setTimeout`
 *   ichidagi va asinxron kod xatolarini. Ular render paytida emas,
 *   keyinroq otiladi. API xatolari shuning uchun alohida ushlanadi
 *   (`ApiError`, har bo'limning o'z xato holati — S-031).
 */
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    // Hozircha faqat konsol: tashqi kuzatuv xizmati (Sentry va h.k.)
    // ulanmagan va uni provayder nomi bilan birga alohida task hal
    // qiladi. Baribir yozib qo'yiladi — dev'da darhol ko'rinsin.
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  /** Marshrut almashganda qayta urinish — `Layout` `key` orqali chaqiradi. */
  reset = () => this.setState({ failed: false })

  render() {
    if (!this.state.failed) return this.props.children
    if (this.props.fallback) return this.props.fallback(this.reset)

    return (
      <section className="relative z-10 flex min-h-[70svh] flex-col justify-center edge py-[clamp(7rem,16vw,13rem)]">
        <span className="type-label text-clay">Xatolik</span>
        <h1 className="mt-8 max-w-[20ch] type-head">Bu bo‘limni ko‘rsatib bo‘lmadi.</h1>
        <p className="mt-8 max-w-[44ch] text-clay">
          Sahifaning shu qismida kutilmagan xato yuz berdi. Sahifani yangilab
          ko‘ring — qolgan bo‘limlar ishlayapti.
        </p>

        <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
          <button
            type="button"
            onClick={this.reset}
            className="group type-action flex items-center gap-3"
          >
            Qayta urinish
            <span className="block h-px w-10 origin-left bg-charcoal transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
          </button>
          {/* `<a>`, `<Link>` emas: router ham yiqilgan bo'lishi mumkin,
              to'liq qayta yuklash ishonchliroq. */}
          <a
            href="/"
            className="group type-action flex items-center gap-3 text-clay hover:text-charcoal"
          >
            Bosh sahifa
            <span className="block h-px w-10 origin-left bg-clay transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
          </a>
        </div>
      </section>
    )
  }
}
