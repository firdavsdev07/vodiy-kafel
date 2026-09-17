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

  useEffect(() => {
    initLenis()
    return () => destroyLenis()
  }, [])

  // Own the final lock after child effects and Lenis initialization.
  useEffect(() => {
    if (gateOpen || menuOpen) stopScroll()
    else startScroll()
  }, [gateOpen, menuOpen])

  useEffect(() => {
    scrollToTop(true)
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 280)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  return (
    <EntryContext.Provider value={entered}>
      <Cursor />
      <Nav open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main ref={mainRef} id="main">
        {/* Suspense chegarasi shu yerda — Nav, Footer va kursor sahifa
            almashganda mount holicha qoladi, ekran oqarmaydi. */}
        <Suspense fallback={<RouteSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      <Footer />

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
