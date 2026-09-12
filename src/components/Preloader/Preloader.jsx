import { useEffect, useRef } from 'react'
import { ArrowUpRight, Volume2, VolumeX } from 'lucide-react'
import { gsap, prefersReducedMotion } from '@/animations/gsap'
import { startScroll, stopScroll } from '@/lib/lenis'
import { markEntered } from '@/lib/session'
import { playTone, setSoundEnabled } from '@/lib/sound'

export default function Preloader({ onDone }) {
  const root = useRef(null)
  const leaving = useRef(false)
  useEffect(() => {
    stopScroll()
    const previous = document.activeElement
    root.current?.querySelector('button')?.focus({ preventScroll: true })
    const context = gsap.context(() => {
      if (!prefersReducedMotion()) gsap.from('.entry-content > *', { y: 24, opacity: 0, duration: .8, stagger: .08 })
    }, root)
    return () => { context.revert(); startScroll(); previous?.focus?.({ preventScroll: true }) }
  }, [])
  const enter = (sound) => {
    if (leaving.current) return
    leaving.current = true
    setSoundEnabled(sound)
    if (sound) playTone('enter')
    markEntered()
    const finish = () => { startScroll(); onDone() }
    if (prefersReducedMotion()) finish()
    else gsap.to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'power3.inOut', onComplete: finish })
  }
  return (
    <div ref={root} className="entry-screen" role="dialog" aria-modal="true" aria-label="Vodiy Kafel — xush kelibsiz"
      onKeyDown={(event) => {
        if (event.key === 'Escape') enter(false)
        if (event.key === 'Tab') {
          const buttons = [...root.current.querySelectorAll('button')]
          event.preventDefault()
          buttons[(buttons.indexOf(document.activeElement) + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus()
        }
      }}>
      <div className="entry-top type-label"><span>Vodiy Kafel®</span><span>Farg‘ona · 2026</span></div>
      <div className="entry-content">
        <span className="type-label">Material. Yorug‘lik. Makon.</span>
        <h1>Go‘zallik<br />yuzadan boshlanadi<span>.</span></h1>
        <p>Keramika va tabiiy tosh estetikasiga<br />yangicha nigoh.</p>
        <div className="entry-actions">
          <button onClick={() => enter(true)}><Volume2 size={16} /> Ovoz bilan kirish <ArrowUpRight size={20} /></button>
          <button onClick={() => enter(false)}><VolumeX size={16} /> Ovozsiz kirish</button>
        </div>
      </div>
      <div className="entry-bottom type-label"><span>Premium ceramic surfaces</span><span>Uzbekistan</span></div>
    </div>
  )
}
