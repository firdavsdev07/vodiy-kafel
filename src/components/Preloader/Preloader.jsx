import { useEffect, useRef } from 'react'
import { gsap, prefersReducedMotion } from '@/animations/gsap'
import { company } from '@/data/company'
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
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
        tl.from('.entry-top', { opacity: 0, y: -15, duration: 0.8, delay: 0.2 })
        tl.from('.entry-brand', { opacity: 0, y: 50, duration: 1.1, stagger: 0.1 }, 0.4)
        tl.from('.entry-enter', { opacity: 0, y: 20, duration: 0.8 }, 0.8)
        tl.from('.entry-bottom', { opacity: 0, y: 15, duration: 0.8 }, 1.0)
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
    else {
      const tl = gsap.timeline({ onComplete: finish })
      tl.to('.entry-brand, .entry-enter, .entry-top, .entry-bottom', {
        opacity: 0, y: -30, duration: 0.5, stagger: 0.04, ease: 'power3.in',
      })
      tl.to(root.current, {
        clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: 'power3.inOut',
      }, 0.3)
    }
  }

  const year = new Date().getFullYear()

  return (
    <div
      ref={root}
      className="entry-screen fixed inset-0 z-[200] flex flex-col justify-between overflow-hidden bg-ink text-bone edge pb-10 pt-10 md:pt-14 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Vodiy Kafel"
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === 'Escape') enter()
      }}
    >
      {/* Top bar — identical to Footer top status */}
      <div className="entry-top flex items-baseline justify-between">
        <span className="type-label text-clay">00 — Kirish</span>
        <span className="type-label text-clay">{company.location}</span>
      </div>

      {/* Main heading and simple CTA — minimal, bold, clean, centered & larger */}
      <div className="entry-center my-auto flex flex-col items-center justify-center text-center w-full">
        <h1 className="type-display text-bone flex flex-wrap items-center justify-center gap-x-[0.28em] text-[clamp(2.5rem,9.5vw,11.5rem)] tracking-tight">
          <span className="line-mask inline-block">
            <span className="entry-brand block">Vodiy</span>
          </span>
          <span className="line-mask inline-block">
            <span className="entry-brand block">
              Kafel<sup className="text-clay text-[0.35em] font-normal ml-2 tracking-normal">®</sup>
            </span>
          </span>
        </h1>

        <div className="mt-[clamp(2rem,5vw,4.5rem)]">
          <button
            type="button"
            onClick={enter}
            data-cursor=""
            className="entry-enter group inline-block border-b border-bone/25 pb-1 text-[clamp(1.25rem,2.5vw,2rem)] transition-colors hover:border-bone/70 hover:text-clay cursor-pointer"
          >
            <span className="type-sub inline-flex items-center gap-3">
              <span>Kirish</span>
              <span className="text-clay transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1">↗</span>
            </span>
          </button>
        </div>
      </div>

      {/* Bottom info bar — identical to Footer bottom row */}
      <div className="entry-bottom flex flex-col gap-4 border-t border-bone/15 pt-6 md:flex-row md:items-center md:justify-between">
        <span className="type-label text-clay">
          © {year} {company.legalName}
        </span>
        <span className="type-label text-clay">{company.tagline}</span>
        <span className="type-label text-clay">{company.contact.handle}</span>
      </div>
    </div>
  )
}
