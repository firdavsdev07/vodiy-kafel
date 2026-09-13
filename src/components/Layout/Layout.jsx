import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { ScrollTrigger } from '@/animations/gsap'
import Cursor from '@/components/Cursor/Cursor'
import Footer from '@/components/Footer/Footer'
import Menu from '@/components/Menu/Menu'
import Nav from '@/components/Nav/Nav'
import Preloader from '@/components/Preloader/Preloader'
import { destroyLenis, initLenis, scrollToTop, startScroll, stopScroll } from '@/lib/lenis'
import { EntryContext } from '@/lib/entryContext'
import { hasEnteredThisSession } from '@/lib/session'

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
