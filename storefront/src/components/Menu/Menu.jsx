import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { EASE, EASE_IN_OUT, gsapLoaded, loadGsap } from '@/animations/gsap'
import { prefersReducedMotion } from '@/lib/motion'
import SoundToggle from '@/components/Nav/SoundToggle'
import SmartImage from '@/components/ui/SmartImage'
import { company } from '@/data/company'
import { BATH, INTERIOR, MARBLE, TILE, TRAVERTINE } from '@/data/images'
import { useIsTouch } from '@/hooks/useMediaQuery'
import { startScroll, stopScroll } from '@/lib/lenis'
import { playTone } from '@/lib/sound'
import { useMainBranch } from '@/shared/api'

/**
 * One still per destination — the background answers the hovered link.
 *
 * ⚠ TARTIB `company.nav` BILAN BIR XIL bo'lishi SHART: `hovered` —
 *   havolaning indeksi, shu indeks bilan surat tanlanadi. Menyuga
 *   yangi havola qo'shilsa, bu yerga ham surat qo'shiladi, aks holda
 *   oxirgi havola foni ko'rinmay qoladi (S-027 da aynan shunday
 *   bo'lgandi: galereya qo'shildi, surat qo'shilmadi).
 */
const STILLS = [INTERIOR[4], MARBLE[0], TILE[5], INTERIOR[8], TRAVERTINE[0], BATH[1]]

export default function Menu({ open, onClose }) {
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const listRef = useRef(null)
  const asideRef = useRef(null)
  const isTouch = useIsTouch()
  const location = useLocation()
  const [hovered, setHovered] = useState(0)
  const { data: branch } = useMainBranch()

  /* Close on route change and on Escape. */
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    if (open) {
      stopScroll()
      setHovered(0)
    } else {
      startScroll()
    }

    if (prefersReducedMotion()) {
      root.style.opacity = open ? '1' : '0'
      root.style.visibility = open ? 'visible' : 'hidden'
      root.style.pointerEvents = open ? 'auto' : 'none'
      return
    }

    /* Yopiq menyu CSS bilan yashiringan (`opacity-0`), shuning uchun
       birinchi OCHILGUNCHA bu yerda animatsiya qiladigan narsa yo'q —
       GSAP ham so'ralmaydi (S-018). */
    if (!open && !gsapLoaded()) return

    let cancelled = false
    let ctx = null

    void loadGsap().then(({ gsap }) => {
      if (cancelled) return
      const items = listRef.current?.querySelectorAll('.menu-line') ?? []
      ctx = gsap.context(() => {
        if (open) {
          gsap.set(root, { autoAlpha: 1, pointerEvents: 'auto' })
          gsap
            .timeline()
            .fromTo(
              panelRef.current,
              { clipPath: 'inset(0% 0% 100% 0%)' },
              { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: EASE_IN_OUT },
            )
            .fromTo(
              items,
              { yPercent: 115 },
              { yPercent: 0, duration: 1.05, ease: EASE, stagger: 0.07 },
              '-=0.55',
            )
            .fromTo(
              asideRef.current,
              { autoAlpha: 0, y: 20 },
              { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE },
              '-=0.6',
            )
        } else {
          gsap
            .timeline({
              onComplete: () => gsap.set(root, { autoAlpha: 0, pointerEvents: 'none' }),
            })
            .to(items, { yPercent: -115, duration: 0.55, ease: EASE_IN_OUT, stagger: 0.035 })
            .to(asideRef.current, { autoAlpha: 0, duration: 0.3 }, 0)
            .to(
              panelRef.current,
              { clipPath: 'inset(100% 0% 0% 0%)', duration: 0.8, ease: EASE_IN_OUT },
              '-=0.25',
            )
        }
      }, root)
    })

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-[150] opacity-0"
      aria-hidden={!open}
    >
      <div ref={panelRef} className="relative h-full w-full overflow-hidden bg-ink text-bone">
        {/* background still — desktop only, kept quiet */}
        {!isTouch && (
          <div className="pointer-events-none absolute inset-0">
            {STILLS.map((id, i) => (
              <div
                key={id}
                className="absolute inset-0 transition-opacity duration-[1200ms] ease-[cubic-bezier(.16,1,.3,1)]"
                style={{ opacity: hovered === i ? 0.26 : 0 }}
              >
                <SmartImage
                  id={id}
                  alt=""
                  reveal={false}
                  className="h-full w-full"
                  sizes="100vw"
                  imgClassName="scale-105"
                />
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
          </div>
        )}

        <div className="relative flex h-full flex-col justify-between edge pb-8 pt-24 md:py-10">
          <div className="flex items-baseline justify-between">
            <span className="type-label text-clay">Indeks</span>
            <span className="type-label text-clay">{company.location}</span>
          </div>

          <nav ref={listRef} className="py-10">
            <ul onMouseLeave={() => setHovered(0)}>
              {company.nav.map((item, i) => {
                const active = location.pathname === item.to
                return (
                  <li key={item.to} className="line-mask">
                    <Link
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      onMouseEnter={() => {
                        setHovered(i)
                        playTone('hover')
                      }}
                      onClick={() => playTone('click')}
                      className="menu-line group -my-1.5 flex items-baseline gap-[clamp(1rem,3vw,3rem)] py-1.5"
                    >
                      <span className="type-label w-8 shrink-0 text-clay">{item.index}</span>
                      {/* Faqat sarlavha xiralashadi — kichik matnlar (index, en)
                          o'zgarmas qoladi: xira holatda ular AA kontrastdan (S-006)
                          pastga tushib, o'qib bo'lmas edi. */}
                      <span
                        className="type-head transition-opacity duration-500 max-md:text-[length:min(var(--text-head),9.5vw)]"
                        style={{ opacity: hovered === i || isTouch ? 1 : 0.42 }}
                      >
                        {item.label}
                      </span>
                      {/* "— joriy" endi mobilda ham ko'rinadi (S-014) — avval
                          `hidden md:block` ichida edi, ya'ni joriy sahifa
                          FAQAT desktopda belgilanardi. */}
                      {active ? (
                        <span className="type-label text-clay">— joriy</span>
                      ) : (
                        <span className="type-label hidden text-clay md:block">{item.en}</span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div
            ref={asideRef}
            className="flex flex-col gap-6 border-t border-bone/15 pt-6 md:flex-row md:items-end md:justify-between"
          >
            <div className="flex flex-col gap-1">
              {company.contact.phones.map((phone, i) => (
                <a
                  key={phone}
                  href={`tel:${company.contact.phoneHref[i]}`}
                  className="text-[clamp(1rem,1.6vw,1.35rem)] transition-colors hover:text-clay"
                >
                  {phone}
                </a>
              ))}
            </div>
            {/* Manzil API'dan (S-025). Backend javob bermasa blok
                chiqmaydi — telefon va ijtimoiy tarmoqlar yuqorida
                qolgani uchun aloqa imkoni yo'qolmaydi. */}
            {branch && (
              <div className="type-label text-clay">
                {branch.address}
                <br />
                <span className="text-bone">{branch.workingHours}</span>
              </div>
            )}
            <div className="flex gap-6">
              <a href={company.contact.telegram} target="_blank" rel="noreferrer" className="type-label text-clay transition-colors hover:text-bone">
                Telegram
              </a>
              <a href={company.contact.instagram} target="_blank" rel="noreferrer" className="type-label text-clay transition-colors hover:text-bone">
                Instagram
              </a>
            </div>

            {/* Mobile-only (S-013): the floating `SoundToggle` in `Nav.jsx`
                is hidden below `md` — on a phone screen it had nowhere
                fixed to sit without landing on top of *something* (the
                hero photo, a product name, a spec value, all measured).
                Menu already opens on every page, so it's a natural,
                always-reachable home for it instead. */}
            <SoundToggle className="text-bone md:hidden" />
          </div>
        </div>
      </div>
    </div>
  )
}
