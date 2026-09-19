import SmartImage from '@/components/ui/SmartImage'
import { company } from '@/data/company'
import { useParallax } from '@/hooks/useParallax'
import { useReveal } from '@/hooks/useReveal'

/** Cinematic location moment — the only full-bleed photograph on Home. */
export default function ShowroomSection() {
  const ref = useReveal({ start: 'top 75%' })
  const parallaxRef = useParallax(120)
  const { showroom } = company

  return (
    <section
      ref={ref}
      data-reveal=""
      className="relative z-10 bg-ink text-bone"
    >
      <div className="relative h-[100svh] min-h-[560px] w-full overflow-hidden">
        <div ref={parallaxRef} className="absolute inset-x-0 -inset-y-[12%]">
          <SmartImage
            id={showroom.image}
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
            <span className="r-fade type-label text-clay">40.3864 / 71.7864</span>
          </div>

          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            {/* `.r-word` — SplitText (S-019), IntroSection dagi kabi */}
            <h2 className="type-head">
              <span className="r-word">Farg‘ona <br /> showroom</span>
            </h2>

            <div className="r-fade flex flex-col gap-6 md:items-end md:text-right">
              <address className="not-italic leading-relaxed">
                {showroom.street}
                <br />
                <span className="text-clay">{showroom.landmark}</span>
              </address>

              <div>
                <div className="type-label text-clay">Ochiq</div>
                <div className="mt-2 text-[clamp(1.1rem,2vw,1.6rem)]">
                  {showroom.hours}
                </div>
                <div className="mt-1 type-label text-clay">{showroom.days}</div>
              </div>

              <a
                href={showroom.mapUrl}
                target="_blank"
                rel="noreferrer"
                data-cursor="Ochish"
                className="group type-action flex items-center gap-3 md:justify-end"
              >
                Xaritada ko‘rish
                <span className="block h-px w-8 origin-left bg-bone transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-x-[2.0]" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
