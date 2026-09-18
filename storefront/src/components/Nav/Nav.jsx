import { Link } from 'react-router-dom'

import SoundToggle from '@/components/Nav/SoundToggle'
import { company } from '@/data/company'
import { playTone } from '@/lib/sound'

/**
 * Floating UI, not a navbar — see DESIGN.md §8.
 *
 * Everything uses mix-blend-difference so a single set of controls stays
 * legible over both the bone and ink grounds, and over the WebGL canvas.
 */
export default function Nav({ open, onToggle }) {
  return (
    <header className="floating-nav pointer-events-none fixed inset-0 z-[160]">
      <div className="relative h-full edge py-6 text-bone md:py-8">
        <Link
          to="/"
          data-cursor=""
          onClick={() => playTone('click')}
          className="pointer-events-auto absolute left-[clamp(1.25rem,4vw,4.5rem)] top-6 type-label md:top-8"
        >
          Vodiy Kafel<sup className="text-[0.8em]">®</sup>
        </Link>

        <button
          type="button"
          data-cursor=""
          onClick={() => {
            playTone(open ? 'close' : 'open')
            onToggle()
          }}
          aria-expanded={open}
          className="pointer-events-auto absolute right-[clamp(1.25rem,4vw,4.5rem)] top-6 type-label md:top-8"
        >
          <span className="relative block h-[1em] w-[5.6em] overflow-hidden text-right">
            <span
              className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)]"
              style={{ transform: open ? 'translateY(-120%)' : 'none' }}
            >
              Menyu
            </span>
            <span
              className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)]"
              style={{ transform: open ? 'none' : 'translateY(120%)' }}
            >
              Yopish
            </span>
          </span>
        </button>

        <a
          href={`tel:${company.contact.phoneHref[0]}`}
          data-cursor=""
          className="pointer-events-auto absolute bottom-6 left-[clamp(1.25rem,4vw,4.5rem)] hidden type-action md:bottom-8 md:block"
        >
          {company.contact.phones[0]}
        </a>

        <SoundToggle className="pointer-events-auto absolute bottom-6 right-[clamp(1.25rem,4vw,4.5rem)] text-bone md:bottom-8" />
      </div>
    </header>
  )
}
