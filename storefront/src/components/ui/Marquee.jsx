import { useEffect, useRef } from 'react'

import { gsap, prefersReducedMotion } from '@/animations/gsap'

/** Continuous horizontal drift. Used as typographic texture, never as a CTA. */
export default function Marquee({ children, speed = 38, className = '' }) {
  const trackRef = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.to(track, {
        xPercent: -50,
        duration: speed,
        ease: 'none',
        repeat: -1,
      })
    }, track)
    return () => ctx.revert()
  }, [speed])

  return (
    <div className={`overflow-hidden ${className}`} aria-hidden="true">
      <div ref={trackRef} className="flex w-max">
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0">{children}</div>
      </div>
    </div>
  )
}
