import { Link } from 'react-router-dom'

import SoundToggle from '@/components/Nav/SoundToggle'
import { company } from '@/data/company'
import { playTone } from '@/lib/sound'

/**
 * Floating UI, not a navbar — see DESIGN.md §8.
 *
 * Every control keeps a borderless, content-hugging veil + forced ink
 * color (`.floating-nav a, .floating-nav button` in index.css) so it stays
 * legible whether it's floating over a light or a dark section.
 */
export default function Nav({ open, onToggle, toggleRef }) {
  return (
    <header className="floating-nav pointer-events-none fixed inset-0 z-[160]">
      <div className="relative h-full edge py-6 text-bone md:py-8">
        <Link
          to="/"
          data-cursor=""
          onClick={() => playTone('click')}
          aria-label="Vodiy Kafel — bosh sahifa"
          className="pointer-events-auto absolute left-[clamp(1.25rem,4vw,4.5rem)] top-6 p-1 md:top-8"
        >
          <img src="/favicon-192.png" alt="" width="52" height="52" className="block size-11 md:size-[3.25rem]" />
        </Link>

        <button
          ref={toggleRef}
          type="button"
          data-cursor=""
          onClick={() => {
            playTone(open ? 'close' : 'open')
            onToggle()
          }}
          aria-expanded={open}
          aria-label={open ? 'Menyuni yopish' : 'Menyuni ochish'}
          className="nav-chip pointer-events-auto absolute right-[clamp(1.25rem,4vw,4.5rem)] top-6 type-label md:top-8"
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
          className="pointer-events-auto absolute bottom-6 left-[clamp(1.25rem,4vw,4.5rem)] hidden type-action md:bottom-8 md:block px-1 py-2"
        >
          {company.contact.phones[0]}
        </a>

        {/* Hidden below `md` (S-013) — moved into the menu overlay
            instead, see `Menu.jsx`: a fixed bottom-right control had
            nowhere to sit on a phone screen without landing on top of
            page content (hero photo, product name, spec values — all
            measured). `env(safe-area-inset-bottom)` clears the iPhone
            home-indicator strip on the desktop instance that remains. */}
        <SoundToggle className="pointer-events-auto absolute right-[clamp(1.25rem,4vw,4.5rem)] hidden text-bone md:block md:bottom-[calc(2rem+env(safe-area-inset-bottom))]" />
      </div>
    </header>
  )
}
