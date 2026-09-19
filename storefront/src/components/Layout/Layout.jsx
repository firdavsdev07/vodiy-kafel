import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { ScrollTrigger } from '@/animations/gsap'
import Cursor from '@/components/Cursor/Cursor'
import Footer from '@/components/Footer/Footer'
import Menu from '@/components/Menu/Menu'
import Nav from '@/components/Nav/Nav'
import RouteSkeleton from '@/components/ui/RouteSkeleton'
import { destroyLenis, initLenis, scrollToTop, startScroll, stopScroll } from '@/lib/lenis'
import { EntryContext } from '@/lib/entryContext'
import { hasEnteredThisSession } from '@/lib/session'

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

  useEffect(() => {
    scrollToTop(true)
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 280)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  return (
    <EntryContext.Provider value={entered}>
      <Cursor />
      <Nav open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} toggleRef={menuToggleRef} />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main ref={mainRef} id="main">
        {/* Suspense chegarasi shu yerda — Nav, Footer va kursor sahifa
            almashganda mount holicha qoladi, ekran oqarmaydi. */}
        <Suspense fallback={<RouteSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      <div ref={footerRef}>
        <Footer />
      </div>

      {gateOpen && (
        <Suspense fallback={null}>
          <Preloader
            onDone={() => {
              setEntered(true)
              setGateOpen(false)
              requestAnimationFrame(() => ScrollTrigger.refresh())
            }}
          />
        </Suspense>
      )}
    </EntryContext.Provider>
  )
}
