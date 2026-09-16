import { useEffect, useState } from 'react'

import { isSoundEnabled, subscribeSound } from '@/lib/sound'

export function useSoundEnabled() {
  const [on, setOn] = useState(isSoundEnabled)
  useEffect(() => subscribeSound(setOn), [])
  return on
}

export default useSoundEnabled
