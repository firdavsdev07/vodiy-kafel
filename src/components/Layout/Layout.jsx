import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { ScrollTrigger, gsap } from '@/animations/gsap'
import Cursor from '@/components/Cursor/Cursor'
import Footer from '@/components/Footer/Footer'
import Menu from '@/components/Menu/Menu'
import Nav from '@/components/Nav/Nav'
import Preloader from '@/components/Preloader/Preloader'
import { destroyLenis, initLenis, scrollToTop } from '@/lib/lenis'
import { EntryContext } from '@/lib/entryContext'
import { hasEnteredThisSession } from '@/lib/session'

export default function Layout() {
  const location = useLocation()
  const [gateOpen, setGateOpen] = useState(() => !hasEnteredThisSession() || new URLSearchParams(window.location.search).has('intro'))
  const [entered, setEntered] = useState(() => hasEnteredThisSession() && !new URLSearchParams(window.location.search).has('intro'))
  const [menuOpen, setMenuOpen] = useState(false)
  const mainRef = useRef(null)
  const prevPath = useRef(location.pathname)

  useEffect(() => {
    initLenis()
    return () => destroyLenis()
  }, [])

  /*
   * On route change:
   *  1. useLayoutEffect kills all ScrollTriggers and tweens BEFORE React
   *     commits the new DOM, preventing "target not found" errors.
   *  2. useEffect (below) scrolls to top and refreshes triggers after
   *     the new page has rendered.
   */
  useLayoutEffect(() => {
    if (prevPath.current === location.pathname) return
    prevPath.current = location.pathname

    // Kill every ScrollTrigger and tween tied to the outgoing page
    ScrollTrigger.getAll().forEach((st) => st.kill())
    gsap.killTweensOf(mainRef.current)
  }, [location.pathname])

  useEffect(() => {
    scrollToTop(true)
    // Give the new page time to mount, then refresh triggers
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 280)
    return () => window.clearTimeout(id)
  }, [location.pathname])

  return (
    <EntryContext.Provider value={entered}>
      <Cursor />
      <Nav open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
      <Menu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main ref={mainRef} id="main">
        <Outlet />
      </main>

      <Footer />

      {gateOpen && (
        <Preloader
          onDone={() => {
            setEntered(true)
            setGateOpen(false)
            requestAnimationFrame(() => ScrollTrigger.refresh())
          }}
        />
      )}
    </EntryContext.Provider>
  )
}

