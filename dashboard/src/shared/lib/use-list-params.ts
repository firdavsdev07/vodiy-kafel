import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  parseListParams,
  writeListParams,
  type ListParams,
  type ListParamsConfig,
  type ListParamsPatch,
} from './list-params';

/**
 * Ro'yxat sahifasi holati URL'da (D-008, G10):
 *
 *   const list = useListParams({ filterKeys: ['search', 'isActive'], sortKeys: ['name', 'createdAt'] });
 *   useQuery({ queryKey: queryKeys.products.list(list.params), queryFn: () => api.getWithMeta(..., { query: toApiQuery(list.params) }) })
 *
 * ⚠ `config` komponentdan TASHQARIDA (modul darajasida) e'lon qilinsin —
 * har renderda yangi obyekt bo'lsa memo ishlamaydi.
 */
export function useListParams<F extends Record<string, string>>(config: ListParamsConfig<F>) {
  const [search, setSearch] = useSearchParams();
  const params: ListParams<F> = useMemo(() => parseListParams(search, config), [search, config]);

  const update = useCallback(
    (patch: ListParamsPatch<F>) =>
      // replace: har harf/sahifa brauzer tarixini to'ldirmasin
      setSearch((current) => writeListParams(current, patch, config), { replace: true }),
    [setSearch, config],
  );

  const resetFilters = useCallback(
    () =>
      update({
        filters: Object.fromEntries(config.filterKeys.map((k) => [k, undefined])) as ListParamsPatch<F>['filters'],
      }),
    [update, config],
  );

  return {
    params,
    update,
    setPage: useCallback((page: number) => update({ page }), [update]),
    setLimit: useCallback((limit: number) => update({ limit }), [update]),
    setFilter: useCallback(
      (key: keyof F & string, value: string | undefined) =>
        update({ filters: { [key]: value } as ListParamsPatch<F>['filters'] }),
      [update],
    ),
    resetFilters,
    hasFilters: Object.keys(params.filters).length > 0,
  };
}
