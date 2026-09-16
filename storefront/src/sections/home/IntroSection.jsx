import { company } from '@/data/company'
import { useReveal } from '@/hooks/useReveal'

/** Editorial statement. Low word count, very large type (DESIGN.md §3). */
export default function IntroSection() {
  const ref = useReveal({ start: 'top 75%', stagger: 0.09 })

  return (
    <section
      id="intro"
      ref={ref}
      data-reveal=""
      className="relative z-10 bg-bone edge py-[clamp(6rem,16vw,14rem)]"
    >
      <div className="flex items-baseline justify-between">
        <span className="type-label text-clay">01 — Kirish</span>
        <span className="type-label text-clay">Est. {2026 - 20}</span>
      </div>

      <h2 className="mt-[clamp(3rem,8vw,7rem)] type-head">
        <span className="line-mask">
          <span className="r-line">Yigirma yildan</span>
        </span>
        <span className="line-mask">
          <span className="r-line">ortiq tajriba.</span>
        </span>
      </h2>

      <div className="mt-[clamp(3rem,9vw,8rem)] grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5 md:col-start-7">
          <p className="type-editorial">
            <span className="line-mask">
              <span className="r-line">Zamonaviy makonlar</span>
            </span>
            <span className="line-mask">
              <span className="r-line">uchun keramik</span>
            </span>
            <span className="line-mask">
              <span className="r-line">yechimlar.</span>
            </span>
          </p>
          <p className="r-fade mt-8 max-w-[46ch] text-clay">{company.intro}</p>
        </div>
      </div>
    </section>
  )
}
