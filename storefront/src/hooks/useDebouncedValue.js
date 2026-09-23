import { useEffect, useState } from 'react'

/**
 * Qiymatni kechiktiradi — qidiruv inputi har harfda so'rov yubormasin
 * (S-024). `value` o'zgarishi to'xtab, `delayMs` o'tgandan keyingina
 * qaytarilgan qiymat yangilanadi.
 */
export function useDebouncedValue(value, delayMs = 400) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
