import { useSoundEnabled } from '@/hooks/useSoundEnabled'
import { toggleSound } from '@/lib/sound'

const BARS = [0.35, 0.85, 0.55, 1, 0.45]

export default function SoundToggle({ className = '' }) {
  const on = useSoundEnabled()

  return (
    <button
      type="button"
      data-cursor=""
      onClick={toggleSound}
      aria-pressed={on}
      aria-label={on ? 'Ovozni o‘chirish' : 'Ovozni yoqish'}
      className={`group flex items-center gap-3 ${className}`}
    >
      <span aria-hidden="true" className="flex h-3 items-center gap-[2px]">
        {BARS.map((h, i) => (
          <span
            key={i}
            className="w-[2px] bg-current transition-[height,opacity] duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
            style={{
              height: on ? `${h * 100}%` : '15%',
              opacity: on ? 1 : 0.45,
              transitionDelay: `${i * 45}ms`,
            }}
          />
        ))}
      </span>
      <span className="type-label">{on ? 'Ovoz yoqilgan' : 'Ovoz o‘chiq'}</span>
    </button>
  )
}
