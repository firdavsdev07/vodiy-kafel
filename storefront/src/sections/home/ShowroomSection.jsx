import SmartImage from '@/components/ui/SmartImage'
import { INTERIOR } from '@/data/images'
import { useParallax } from '@/hooks/useParallax'
import { useReveal } from '@/hooks/useReveal'
import { useMainBranch } from '@/shared/api'

/**
 * Cinematic location moment — the only full-bleed photograph on Home.
 *
 * Manzil, ish vaqti va koordinata API'dan (S-025) — ro'yxatdagi
 * birinchi do'kon. Fon surati esa BINONING surati emas, umumiy
 * interyer kadri: u sahifa bezagi, ma'lumot emas.
 */
export default function ShowroomSection() {
  const ref = useReveal({ start: 'top 75%' })
  const parallaxRef = useParallax(120)
  const { data: branch } = useMainBranch()

  return (
    <section
      ref={ref}
      data-reveal=""
      className="relative z-10 bg-ink text-bone"
    >
      <div className="relative h-[100svh] min-h-[560px] w-full overflow-hidden">
        <div ref={parallaxRef} className="absolute inset-x-0 -inset-y-[12%]">
          <SmartImage
            id={INTERIOR[4]}
            src={branch?.image}
            alt="Travertin bilan bezatilgan namunaviy interyer"
            className="h-full w-full"
            sizes="100vw"
            width={2200}
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/35 to-ink/55" />

        <div className="relative flex h-full flex-col justify-between edge py-16">
          <div className="flex items-baseline justify-between">
            <span className="r-fade type-label text-clay">06 — Showroom</span>
            <span className="r-fade type-label text-clay">{branch?.coordinates}</span>
          </div>

          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            {/* `.r-word` — SplitText (S-019), IntroSection dagi kabi */}
            <h2 className="type-head">
              <span className="r-word">{branch?.city ?? 'Vodiy Kafel'} <br /> showroom</span>
            </h2>

            {/* Backend javob bermasa matn bloki chiqmaydi — surat,
                sarlavha va bo'lim o'zi joyida qoladi, ya'ni bosh
                sahifada teshik ochilmaydi. */}
            {branch && (
              <div className="r-fade flex flex-col gap-6 md:items-end md:text-right">
                <address className="not-italic leading-relaxed">{branch.address}</address>

                <div>
                  <div className="type-label text-clay">Ochiq</div>
                  <div className="mt-2 text-[clamp(1.1rem,2vw,1.6rem)]">
                    {branch.workingHours}
                  </div>
                </div>

                {branch.mapUrl && (
                  <a
                    href={branch.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group type-action flex items-center gap-3 md:justify-end"
                  >
                    Xaritada ko‘rish
                    <span className="block h-px w-8 origin-left bg-bone transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
