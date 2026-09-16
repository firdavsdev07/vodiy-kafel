import SmartImage from '@/components/ui/SmartImage'
import { TRAVERTINE } from '@/data/images'
import { useReveal } from '@/hooks/useReveal'

export default function MaterialSection() {
  const ref = useReveal()
  return <section id="material" ref={ref} data-reveal="" className="material-study bg-ink text-bone">
    <div className="material-study-copy">
      <span className="r-fade type-label text-clay">03 / Materialga yaqinroq</span>
      <h2 className="type-head mt-10"><span className="line-mask"><span className="r-line">Tabiatning</span></span><span className="line-mask"><span className="r-line">o‘z imzosi.</span></span></h2>
      <p className="r-fade mt-8 max-w-[34ch] text-clay">Tomirlar, mayin relyef va issiq ohang. Har bir yuza makonga o‘z xarakterini beradi.</p>
      <div className="r-fade mt-12 flex gap-8 type-label"><span>Travertine</span><span>Matte finish</span></div>
    </div>
    <SmartImage id={TRAVERTINE[0]} alt="Tabiiy travertin naqshli keramogranit yuzasi" ratio="4 / 5" className="material-study-image" />
  </section>
}
