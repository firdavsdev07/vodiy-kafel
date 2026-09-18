import { useCallback, useEffect, useSyncExternalStore } from 'react'

import { buildUrl } from './config.js'
import { IDLE_STATE, fetchQuery, readQuery, subscribeQuery } from './query-store.js'

/**
 * GET so'rovini komponentga ulaydi (S-004).
 *
 *   const { data, error, isLoading, refetch } = useApiQuery('/products', {
 *     params: { page, factoryId },
 *   })
 *
 * Kalit — to'liq URL, ya'ni `params` o'zgarishi bilan so'rov o'zi yangilanadi.
 * `enabled: false` — hali erta (masalan `slug` yo'q): so'rov yuborilmaydi.
 */
export function useApiQuery(path, options = {}) {
  const { params, enabled = true, staleMs } = options
  // Primitiv satr — `useMemo` shart emas, effekt bog'liqligi ham shu.
  const key = path && enabled ? buildUrl(path, params) : null

  const subscribe = useCallback(
    (onChange) => (key ? subscribeQuery(key, onChange) : () => {}),
    [key],
  )
  const snapshot = useCallback(() => (key ? readQuery(key) : IDLE_STATE), [key])
  const state = useSyncExternalStore(subscribe, snapshot, snapshot)

  useEffect(() => {
    if (!key) return
    // Xato holati `state.error` da — bu yerda ushlanmasa, brauzer uni
    // "unhandled rejection" deb konsolga chiqaradi.
    fetchQuery(key, { path, params, staleMs }).catch(() => {})
    // `key` ichida `path` ham, `params` ham bor — ular alohida kerak emas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, staleMs])

  const refetch = useCallback(() => {
    if (!key) return Promise.resolve(undefined)
    return fetchQuery(key, { path, params, force: true }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return {
    data: state.data,
    meta: state.meta,
    error: state.error,
    status: state.status,
    /** Birinchi yuklanish — ko'rsatiladigan ma'lumot HALI yo'q (skelet). */
    isLoading: state.status === 'loading' && state.data === undefined,
    /** Fonda yangilanmoqda — eski ma'lumot ekranda turibdi. */
    isFetching: state.status === 'loading',
    isError: state.status === 'error',
    refetch,
  }
}
