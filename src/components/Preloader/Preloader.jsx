import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
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
      if (!prefersReducedMotion()) {
        gsap.from('.entry-logo', { y: -20, opacity: 0, duration: 0.8, delay: 0.1 })
        gsap.from('.entry-heading', { y: 30, opacity: 0, duration: 0.9, delay: 0.3 })
        gsap.from('.entry-btn', { y: 20, opacity: 0, duration: 0.7, delay: 0.6 })
      }
    }, root)
    return () => { context.revert(); startScroll(); previous?.focus?.({ preventScroll: true }) }
  }, [])

  const enter = () => {
    if (leaving.current) return
    leaving.current = true
    setSoundEnabled(true)
    playTone('enter')
    markEntered()
    const finish = () => { startScroll(); onDone() }
    if (prefersReducedMotion()) finish()
    else gsap.to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power3.inOut', onComplete: finish })
  }

  return (
    <div ref={root} className="entry-screen" role="dialog" aria-modal="true" aria-label="Vodiy Kafel"
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') enter()
      }}>
      <div className="entry-center">
        <span className="entry-logo">Vodiy Kafel<sup>®</sup></span>
        <h1 className="entry-heading">Premium keramik yuzalar</h1>
        <button className="entry-btn" onClick={enter} data-cursor="">
          Kirish <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
