import { useCallback, useSyncExternalStore } from 'react'

const serverSnapshot = () => false

/**
 * Media query as an external store — this is what useSyncExternalStore is
 * for, and it avoids the extra render an effect-plus-setState would cause.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot)
}

/** True on devices without a precise pointer — no custom cursor, lighter 3D. */
export const useIsTouch = () => useMediaQuery('(hover: none), (pointer: coarse)')

export const useIsMobile = () => useMediaQuery('(max-width: 767px)')

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)')
