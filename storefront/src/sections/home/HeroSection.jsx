import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import { useEntered } from '@/lib/entryContext'
import { MARBLE, img } from '@/data/images'
import { useMagnetic } from '@/hooks/useMagnetic'

export default function HeroSection() {
  const entered = useEntered()
  // Saytning asosiy CTA'si — magnit effekt shu yerda eng ko'p ko'riladi (S-019)
  const ctaRef = useMagnetic()
  return (
    <section id="hero" className={`hero-gallery ${entered ? 'has-entered' : ''}`}>
      <div className="hero-copy">
        <p className="type-label hero-eyebrow">01 / Materiallar galereyasi</p>
        <h1>Makon uchun.<br /><span>Did bilan.</span></h1>
        <p className="hero-description">Tabiatdan ilhomlangan yuzalar.<br />Yashash uchun yaratilgan makonlar.</p>
        <Link to="/catalog" ref={ctaRef} className="hero-link">Kolleksiyalarni ko‘rish <ArrowUpRight size={20} /></Link>
      </div>
      <div className="hero-greeter" aria-label="Qo‘lini ko‘ksiga qo‘yib salom berayotgan o‘zbek yigiti">
        <img src="/images/uzbek-greeter.webp" alt="" width="900" height="1350" fetchPriority="high" />
      </div>
      <div className="hero-object-label"><span className="type-label">Assalomu alaykum</span><span>Xush kelibsiz</span></div>
      <div className="hero-bottom">
        <div className="hero-swatch"><img src={img(MARBLE[0], 300)} alt="Marmar tekstura namunasi" /><div><span className="type-label">2026 Selection</span><p>Tabiiy ohang. Yangi talqin.</p></div></div>
        <a href="#intro" aria-label="Keyingi bo‘limga o‘tish" className="hero-scroll"><ArrowDown size={20} /></a>
      </div>
    </section>
  )
}
