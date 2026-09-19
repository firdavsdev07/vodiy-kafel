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

      {/* `.r-word` (S-019): SplitText qatorlarga va so'zlarga o'zi bo'ladi,
          har bir qatorga niqob qutisini o'zi yasaydi. Shuning uchun bu
          yerda `line-mask`/`r-line` juftligi qo'lda yozilmaydi va qator
          uzilishi ekran kengligiga qarab o'zgarsa ham niqob joyida
          qoladi — avval `<br/>` qayerda yozilgan bo'lsa, o'sha yerda
          uzilishga majbur edik. */}
      <h2 className="mt-[clamp(3rem,8vw,7rem)] type-head">
        {/* Bo'sh joylar ATAYLAB: `<br/>` matn emas, shuning uchun
            `Yigirma yildan<br/>ortiq` ning `textContent` i "yildanortiq"
            bo'lib qolardi — SplitText esa `aria-label` ni aynan shundan
            yasaydi, ya'ni ekran o'quvchi qo'shilib ketgan so'zni o'qirdi. */}
        <span className="r-word">Yigirma yildan <br /> ortiq tajriba.</span>
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
