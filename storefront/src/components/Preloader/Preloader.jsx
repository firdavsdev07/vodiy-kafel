import { useLayoutEffect, useRef } from 'react'
import { gsapLoaded, loadGsap } from '@/animations/gsap'
import { prefersReducedMotion } from '@/lib/motion'
import { MARBLE, TRAVERTINE, img } from '@/data/images'
import { startScroll, stopScroll } from '@/lib/lenis'
import { markEntered } from '@/lib/session'
import { playTone, setSoundEnabled } from '@/lib/sound'

const samples = [
  { source: MARBLE[8], angle: -28, x: -105, y: 35 },
  { source: TRAVERTINE[2], angle: -14, x: -54, y: 9 },
  { source: MARBLE[0], angle: 0, x: 0, y: 0 },
  { source: MARBLE[4], angle: 14, x: 54, y: 9 },
  { source: TRAVERTINE[0], angle: 28, x: 105, y: 35 },
]

/** A finite material study, with no simulated network progress or WebGL. */
export default function Preloader({ onDone }) {
  const root = useRef(null)
  const leaving = useRef(false)
  const intro = useRef(null)
  const exit = useRef(null)

  useLayoutEffect(() => {
    stopScroll()
    const previous = document.activeElement
    const el = root.current
    el.focus({ preventScroll: true })

    /* `data-entry='in'` — "endi ko'rsatsa bo'ladi" belgisi (index.css).
       Reduced motion'da darhol qo'yiladi; aks holda GSAP boshlang'ich
       holatni o'rnatgandan KEYIN, ya'ni kompozitsiya yig'ilgan holda
       ko'rinib ketmaydi. */
    if (prefersReducedMotion()) {
      el.setAttribute('data-entry', 'in')
      return () => {
        startScroll()
        previous?.focus?.({ preventScroll: true })
      }
    }

    let cancelled = false
    let context = null

    void loadGsap().then(({ gsap }) => {
      if (cancelled || !root.current) return
      context = gsap.context(() => {
        intro.current = gsap.timeline({ defaults: { ease: 'power3.out' } })
          .fromTo('.entry-sample', { x: 0, y: 0, xPercent: 0, yPercent: 45, rotation: 0, opacity: 0 },
            { xPercent: i => samples[i].x, yPercent: i => samples[i].y, rotation: i => samples[i].angle, opacity: 1, duration: 1.65, stagger: { each: .06, from: 'center' } }, .1)
          .fromTo('.entry-word', { yPercent: 110 }, { yPercent: 0, duration: 1.2, stagger: .12 }, .35)
          .fromTo('.entry-detail', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .7, stagger: .05 }, .55)
          .fromTo('.entry-rule', { scaleX: 0 }, { scaleX: 1, duration: 1.3 }, .3)
      }, root)
      root.current.setAttribute('data-entry', 'in')
    }).catch(() => root.current?.setAttribute('data-entry', 'in'))

    return () => {
      cancelled = true
      intro.current?.kill()
      exit.current?.kill()
      context?.revert()
      startScroll()
      previous?.focus?.({ preventScroll: true })
    }
  }, [])

  const enter = () => {
    if (leaving.current) return
    leaving.current = true
    setSoundEnabled(true)
    playTone('enter')
    const finish = () => { markEntered(); startScroll(); onDone() }
    // GSAP hali kelmagan bo'lsa kutib turilmaydi — darhol kiriladi
    const loaded = gsapLoaded()
    if (prefersReducedMotion() || !loaded) { finish(); return }
    const { gsap } = loaded
    intro.current?.kill()
    const el = root.current
    exit.current = gsap.timeline({ onComplete: finish })
      .to(el.querySelectorAll('.entry-detail, .entry-enter'), { opacity: 0, duration: .2 }, 0)
      .to(el.querySelectorAll('.entry-sample'), { xPercent: 0, yPercent: 8, rotation: 0, duration: .5, ease: 'power3.inOut' }, 0)
      .to(el.querySelector('.entry-study'), { yPercent: -35, opacity: 0, duration: .45, ease: 'power2.in' }, .3)
      .to(el.querySelectorAll('.entry-word'), { yPercent: -110, duration: .6, stagger: .05, ease: 'power3.in' }, .15)
      .to(el, { yPercent: -100, duration: .85, ease: 'power3.inOut' }, .45)
  }

  return (
    <div ref={root} className="entry-screen" role="dialog" aria-modal="true"
      aria-label="Vodiy Kafel — kirish" tabIndex={-1}
      onKeyDown={event => {
        if (event.key === 'Escape' || (event.key === 'Enter' && event.target === root.current)) { event.preventDefault(); enter() }
        if (event.key === 'Tab') { event.preventDefault(); root.current.querySelector('button').focus() }
      }}>
      <header className="entry-top entry-detail">
        <span className="entry-monogram">V/K<sup>®</sup></span>
        <span>FARG‘ONA, UZBEKISTAN<br /><span className="entry-muted">EST. 2006</span></span>
      </header>
      <div className="entry-study" aria-hidden="true">
        <div className="entry-study-axis" />
        {samples.map((sample, i) => (
          <div key={i} className="entry-sample" style={{
            '--sample-x': sample.x + '%', '--sample-y': sample.y + '%',
            '--sample-angle': sample.angle + 'deg', zIndex: 5 - Math.abs(i - 2),
          }}>
            <img src={img(sample.source)} alt="" decoding="async" fetchPriority={i === 2 ? 'high' : 'auto'} />
            <span className="entry-sample-edge" />
          </div>
        ))}
      </div>
      <div className="entry-caption entry-detail"><span>01 — MATERIAL STUDY</span><span>Tabiatdan ilhomlangan.<br />Makon uchun yaratilgan.</span></div>
      <div className="entry-heading">
        <p className="entry-eyebrow entry-detail">SHAKL. YUZA. XARAKTER.</p>
        <p aria-label="Vodiy Kafel"><span className="entry-word-mask"><span className="entry-word">Vodiy</span></span><span className="entry-word-mask"><span className="entry-word">Kafel<span className="entry-period">.</span></span></span></p>
      </div>
      <footer className="entry-bottom">
        <div className="entry-rule" />
        <p className="entry-detail">PREMIUM KERAMIK YUZALAR<br /><span className="entry-muted">Kolleksiya — 2026</span></p>
        <button type="button" className="entry-enter" onClick={enter} data-cursor="">
          <span><span>Kashf eting</span><small>Ovoz bilan saytga kirish</small></span><span className="entry-arrow" aria-hidden="true">↗</span>
        </button>
      </footer>
    </div>
  )
}
