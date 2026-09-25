import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { gsapLoaded } from '@/animations/gsap'
import { prefersReducedMotion } from '@/lib/motion'
import Footer from '@/components/Footer/Footer'
import Menu from '@/components/Menu/Menu'
import Nav from '@/components/Nav/Nav'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import JsonLd from '@/components/ui/JsonLd'
import OfflineBanner from '@/components/ui/OfflineBanner'
import RouteSkeleton from '@/components/ui/RouteSkeleton'
import { destroyLenis, initLenis, scrollToTop, startScroll, stopScroll } from '@/lib/lenis'
import { EntryContext } from '@/lib/entryContext'
import { hasEnteredThisSession } from '@/lib/session'
import { company } from '@/data/company'
import { organizationSchema } from '@/lib/schema'
import { branchModel, useBranches } from '@/shared/api'

/**
 * Kirish darvozasi — `lazy` (S-002). U faqat BIRINCHI tashrifda ochiladi;
 * seansda allaqachon kirgan odam uni umuman yuklab olmaydi.
 */
const Preloader = lazy(() => import('@/components/Preloader/Preloader'))

export default function Layout() {
  const location = useLocation()
  const [gateOpen, setGateOpen] = useState(() => !hasEnteredThisSession() || new URLSearchParams(window.location.search).has('intro'))
  const [entered, setEntered] = useState(() => hasEnteredThisSession() && !new URLSearchParams(window.location.search).has('intro'))
  const [menuOpen, setMenuOpen] = useState(false)
  const mainRef = useRef(null)
  const footerRef = useRef(null)
  const menuToggleRef = useRef(null)
  const wasMenuOpen = useRef(false)
  const veilRef = useRef(null)
  const firstRoute = useRef(true)
  /* Kompaniya sxemasi sayt bo'ylab BITTA joyda (S-039) — har sahifada
     takrorlansa Google uni ikki xil tashkilot deb o'qishi mumkin.
     Manzil `GET /branches` dan (S-025). */
  const { data: branchData } = useBranches()

  useEffect(() => {
    initLenis()
    return () => destroyLenis()
  }, [])

  // Own the final lock after child effects and Lenis initialization.
  useEffect(() => {
    if (gateOpen || menuOpen) stopScroll()
    else startScroll()
  }, [gateOpen, menuOpen])

  /* Focus trap (S-014): `inert` drops everything under `<main>`/`<Footer>`
     from both the tab order and the accessibility tree while the menu is
     open — measured before this, Tab from the menu's last link landed on
     "Kolleksiyalarni ko'rish" in the hero BEHIND the (visually opaque)
     overlay. `Nav` stays reachable on purpose: its z-index (160) sits
     above the menu's (150) specifically so the toggle button — now also
     the close control — is never covered. */
  useEffect(() => {
    const main = mainRef.current
    const footer = footerRef.current
    if (menuOpen) {
      main?.setAttribute('inert', '')
      footer?.setAttribute('inert', '')
    } else {
      main?.removeAttribute('inert')
      footer?.removeAttribute('inert')
    }
  }, [menuOpen])

  // Hardware/browser back closes the menu instead of leaving the page (S-014).
  useEffect(() => {
    if (!menuOpen) return
    history.pushState({ menuOpen: true }, '')
    const onPopState = () => setMenuOpen(false)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [menuOpen])

  // Closing (Esc, backdrop link, back button) returns focus to the same
  // control that opened it, rather than letting it fall back to <body>.
  useEffect(() => {
    if (wasMenuOpen.current && !menuOpen) menuToggleRef.current?.focus()
    wasMenuOpen.current = menuOpen
  }, [menuOpen])

  /* Yangi sahifa mount bo'lgach trigger nuqtalari boshqa joyda —
     qayta o'lchanadi. GSAP hali kelmagan bo'lsa qayta o'lchaydigan
     narsaning o'zi yo'q, shuning uchun sinxron `gsapLoaded()`. */
  useEffect(() => {
    scrollToTop(true)
    const id = window.setTimeout(() => gsapLoaded()?.ScrollTrigger.refresh(), 280)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  /* SAHIFALARARO O'TISH (S-019). Avval marshrut keskin almashardi:
     eski sahifa o'chib, yangisi bir zumda paydo bo'lardi.

     Parda — `<main>` ning O'ZIDA emas, ustidagi alohida qatlamda.
     Ikki sabab: (1) `<main>` ga `opacity` bersak butun daraxt kompozitor
     qatlamiga ko'chadi, parda esa bitta to'rtburchak; (2) `<main>` ga
     `transform` bersak ichidagi ScrollTrigger o'lchovlari (pin-spacer)
     o'tish paytida noto'g'ri hisoblanardi.

     `useLayoutEffect` — bo'yashdan OLDIN. `useEffect` bo'lsa yangi
     sahifa avval ko'rinib, keyin parda tushardi, ya'ni chaqnash. */
  useLayoutEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }
    const veil = veilRef.current
    const gsap = gsapLoaded()?.gsap
    // Birinchi yuklashda GSAP hali yo'q — o'tish ham kerak emas (G4)
    if (!veil || !gsap || prefersReducedMotion()) return

    veil.style.opacity = '1'
    gsap.to(veil, { opacity: 0, duration: 0.55, ease: 'expo.out', overwrite: true })
  }, [location.pathname])

  return (
    <EntryContext.Provider value={entered}>
      <JsonLd
        data={organizationSchema({
          company,
          branches: (branchData ?? []).map(branchModel),
        })}
      />

      {/* Klaviatura bilan yuruvchi odam uchun birinchi element (S-040):
          Nav va menyudan sakrab, to'g'ridan-to'g'ri kontentga o'tadi.
          `<a href>` — router havolasi EMAS: sahifa almashmaydi, faqat
          fokus `<main id="main">` ga ko'chadi. */}
      <a href="#main" className="skip-link">
        Kontentga o‘tish
      </a>

      {/* Aloqa yo'qligi — butun sayt uchun BITTA xabar (S-031), har bir
          bo'lim alohida qichqirmasin. */}
      <OfflineBanner />
      {/* z-140: menyu (150) va Nav (160) dan past — o'tish paytida ham
          menyu tugmasi bosiladigan holda qoladi */}
      <div
        ref={veilRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[140] bg-bone opacity-0"
      />
      <Nav open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} toggleRef={menuToggleRef} />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* `tabIndex={-1}` — skip-link bosilganda `<main>` ga fokus
          tushsin: aks holda brauzer faqat skroll qiladi va keyingi Tab
          yana sahifa boshidan boshlanardi. */}
      <main ref={mainRef} id="main" tabIndex={-1}>
        {/* Suspense chegarasi shu yerda — Nav, Footer va kursor sahifa
            almashganda mount holicha qoladi, ekran oqarmaydi.

            `ErrorBoundary` ichkarida va `key` — marshrut (S-043):
            bir sahifa yiqilsa Nav/Footer joyida qoladi, va boshqa
            sahifaga o'tilganda chegara O'ZI tiklanadi (yangi `key` →
            yangi nusxa), ya'ni odam "qayta urinish" ni bosishi shart
            emas. */}
        <Suspense fallback={<RouteSkeleton />}>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </Suspense>
      </main>

      {/* Footer alohida chegara ichida va yiqilsa JIM o'chadi: u
          yordamchi bo'lim, uning xatosi uchun sahifaning o'rtasiga
          katta xato ekrani chiqarish o'rinsiz bo'lardi. */}
      <div ref={footerRef}>
        <ErrorBoundary fallback={() => null}>
          <Footer />
        </ErrorBoundary>
      </div>

      {gateOpen && (
        // `fallback={null}` avval "hero'ning bir lahza ko'rinib qolishi"ga
        // sabab bo'lardi (2026-09-23): `Preloader` chunk'i yuklanib
        // bo'lguncha uning o'rnida HECH NARSA chizilmaydi, shu payt ostidagi
        // Hero ochiq qoladi. Xuddi shu qog'oz fonli qatlam endi fallback
        // sifatida turadi — chunk kelgach, ustidan aynan shu rangli haqiqiy
        // ekran almashadi, chaqnash bo'lmaydi.
        <Suspense fallback={<div className="fixed inset-0 z-[200] bg-bone" aria-hidden="true" />}>
          <Preloader
            onDone={() => {
              setEntered(true)
              setGateOpen(false)
              requestAnimationFrame(() => gsapLoaded()?.ScrollTrigger.refresh())
            }}
          />
        </Suspense>
      )}
    </EntryContext.Provider>
  )
}
