import { Volume2, VolumeX } from 'lucide-react'
import { useSoundEnabled } from '@/hooks/useSoundEnabled'
import { toggleSound } from '@/lib/sound'

export default function SoundToggle({ className = '' }) {
  const on = useSoundEnabled()
  const Icon = on ? Volume2 : VolumeX

  return (
    <button
      type="button"
      data-cursor=""
      onClick={toggleSound}
      aria-pressed={on}
      aria-label={on ? 'Ovozni o‘chirish' : 'Ovozni yoqish'}
      className={`nav-veil flex items-center justify-center rounded-sm p-2 transition-opacity duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:opacity-70 ${className}`}
    >
      <Icon aria-hidden="true" size={22} strokeWidth={1.6} />
    </button>
  )
}
