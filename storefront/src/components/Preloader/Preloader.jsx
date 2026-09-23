import { useLayoutEffect, useRef } from 'react'
import { gsapLoaded, loadGsap } from '@/animations/gsap'
import { prefersReducedMotion } from '@/lib/motion'
import { startScroll, stopScroll } from '@/lib/lenis'
import { markEntered } from '@/lib/session'
import { playTone, setSoundEnabled } from '@/lib/sound'

const BADGE_TEXT = 'YAXSHIROQ KELAJAK YARATING • YAXSHIROQ KELAJAK YARATING • '

/** Fixed backdrop photo (`entry-backdrop.webp`, ASSETS.md), wordmark, a
 * decorative — but timeline-driven, not fake-network — loading readout. */
export default function Preloader({ onDone }) {
  const root = useRef(null)
  const leaving = useRef(false)
  const intro = useRef(null)
  const exit = useRef(null)
  const fillRef = useRef(null)
  const valueRef = useRef(null)
  const progress = useRef({ value: 0 })

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
      if (fillRef.current) fillRef.current.style.width = '100%'
      if (valueRef.current) valueRef.current.textContent = '100%'
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
          .fromTo('.entry-backdrop', { opacity: 0, scale: 1.05 },
            { opacity: 1, scale: 1, duration: 1.3 }, 0)
          .fromTo('.entry-fade', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .7, stagger: .06 }, .3)
          .fromTo('.entry-word', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: .9, stagger: .12 }, .5)
          .to(progress.current, {
            value: 100, duration: 1.4, ease: 'power1.inOut',
            onUpdate: () => {
              const value = Math.round(progress.current.value)
              if (fillRef.current) fillRef.current.style.width = value + '%'
              if (valueRef.current) valueRef.current.textContent = value + '%'
            },
          }, .5)
          .fromTo('.entry-enter', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .7 }, 1.3)
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
      .to(el.querySelectorAll('.entry-enter, .entry-fade'), { opacity: 0, duration: .2 }, 0)
      .to(el.querySelector('.entry-backdrop'), { opacity: 0, scale: 1.04, duration: .5, ease: 'power2.in' }, 0)
      .to(el.querySelectorAll('.entry-word'), { opacity: 0, y: -20, duration: .5, stagger: .05, ease: 'power3.in' }, .15)
      .to(el, { yPercent: -100, duration: .85, ease: 'power3.inOut' }, .45)
  }

  return (
    <div ref={root} className="entry-screen" role="dialog" aria-modal="true"
      aria-label="Vodiy Kafel — kirish" tabIndex={-1}
      onKeyDown={event => {
        if (event.key === 'Escape' || (event.key === 'Enter' && event.target === root.current)) { event.preventDefault(); enter() }
        if (event.key === 'Tab') { event.preventDefault(); root.current.querySelector('button').focus() }
      }}>
      <div className="entry-backdrop" aria-hidden="true">
        <img src="/images/entry-backdrop.webp" alt="" decoding="async" fetchPriority="high" />
      </div>

      <header className="entry-top">
        <span className="entry-fade entry-est">EST. 2006</span>
        <span className="entry-fade entry-crumbs">Kafel / Interyer / Ilhom</span>
      </header>

      <div className="entry-heading">
        <p className="entry-fade entry-tagline">Kafeldan ko‘proq<br />Eng yaxshi makon</p>
        <p className="entry-title" aria-label="Vodiy Kafel">
          <span className="entry-word entry-word-strong">Vodiy</span>
          <span className="entry-word entry-word-accent">Kafel<span className="entry-period">.</span></span>
        </p>
        <div className="entry-fade entry-progress">
          <span className="entry-progress-track"><span ref={fillRef} className="entry-progress-fill" /></span>
          <span ref={valueRef} className="entry-progress-value">0%</span>
        </div>
        <p className="entry-fade entry-progress-caption">Ilhom yuklanmoqda…</p>
      </div>

      <footer className="entry-bottom">
        <span className="entry-fade entry-corner-label">Sifat<br />Dizayn<br />Makoningiz</span>
        <button type="button" className="entry-enter" onClick={enter} data-cursor="">
          <span>Kashf eting</span><span className="entry-arrow" aria-hidden="true">↗</span>
        </button>
        <div className="entry-fade entry-badge" aria-hidden="true">
          <svg viewBox="0 0 120 120" className="entry-badge-ring">
            <path id="entry-badge-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" fill="none" />
            <text className="entry-badge-text"><textPath href="#entry-badge-circle">{BADGE_TEXT}</textPath></text>
          </svg>
          <span className="entry-badge-icon">✓</span>
        </div>
      </footer>
    </div>
  )
}
