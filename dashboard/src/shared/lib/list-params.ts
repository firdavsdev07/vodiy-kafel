/**
 * Ro'yxat parametrlari ↔ URL query (D-008, G10). Filtr, sahifa, saralash
 * URL'da turadi: yangilanganda yo'qolmaydi, havolani hamkasbga yuborsa
 * o'sha ko'rinish ochiladi.
 */

export type SortOrder = 'asc' | 'desc';

export interface ListParams<F extends Record<string, string>> {
  page: number;
  limit: number;
  sortBy: string | undefined;
  sortOrder: SortOrder | undefined;
  filters: Partial<F>;
}

export interface ListParamsConfig<F extends Record<string, string>> {
  /** Ruxsat etilgan filtr kalitlari — URL'dagi begona parametr o'qilmaydi. */
  filterKeys: readonly (keyof F & string)[];
  defaultLimit?: number;
  /** Ruxsat etilgan `sortBy` qiymatlari (backend enum). Berilmasa — har qanday. */
  sortKeys?: readonly string[];
}

export const DEFAULT_LIMIT = 20;
/** Backend `PaginationQueryDto` — `@Max(100)`. */
export const MAX_LIMIT = 100;
export const LIMIT_OPTIONS = [20, 50, 100] as const;

function positiveInt(raw: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  const n = Number(raw);
  return n >= 1 ? Math.min(n, max) : fallback;
}

export function parseListParams<F extends Record<string, string>>(
  search: URLSearchParams,
  config: ListParamsConfig<F>,
): ListParams<F> {
  const sortByRaw = search.get('sortBy') ?? undefined;
  const sortBy =
    sortByRaw && (!config.sortKeys || config.sortKeys.includes(sortByRaw)) ? sortByRaw : undefined;
  const orderRaw = search.get('sortOrder');
  const filters: Partial<F> = {};
  for (const key of config.filterKeys) {
    const value = search.get(key);
    if (value !== null && value !== '') (filters as Record<string, string>)[key] = value;
  }
  return {
    page: positiveInt(search.get('page'), 1),
    limit: positiveInt(search.get('limit'), config.defaultLimit ?? DEFAULT_LIMIT, MAX_LIMIT),
    sortBy,
    sortOrder: sortBy && (orderRaw === 'asc' || orderRaw === 'desc') ? orderRaw : undefined,
    filters,
  };
}

export type ListParamsPatch<F extends Record<string, string>> = Partial<
  Omit<ListParams<F>, 'filters'> & { filters: Partial<Record<keyof F, string | undefined>> }
>;

/**
 * Yangi URL query. Filtr yoki saralash o'zgarsa — 1-sahifaga qaytadi
 * (aks holda 7-sahifada "bo'sh" natija ko'rinadi). Standart qiymatlar
 * URL'ga yozilmaydi — havola qisqa qoladi.
 */
export function writeListParams<F extends Record<string, string>>(
  current: URLSearchParams,
  patch: ListParamsPatch<F>,
  config: ListParamsConfig<F>,
): URLSearchParams {
  const next = new URLSearchParams(current);
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
  };

  let resetPage = false;
  if (patch.filters) {
    for (const [key, value] of Object.entries(patch.filters)) {
      if (!config.filterKeys.includes(key)) continue;
      if ((current.get(key) ?? undefined) !== (value || undefined)) resetPage = true;
      set(key, value as string | undefined);
    }
  }
  if ('sortBy' in patch || 'sortOrder' in patch) {
    set('sortBy', patch.sortBy);
    set('sortOrder', patch.sortBy ? patch.sortOrder : undefined);
    resetPage = true;
  }
  if ('limit' in patch) {
    set('limit', patch.limit === (config.defaultLimit ?? DEFAULT_LIMIT) ? undefined : patch.limit);
    resetPage = true;
  }
  if (patch.page !== undefined) set('page', patch.page > 1 ? patch.page : undefined);
  else if (resetPage) next.delete('page');
  return next;
}

/** API so'roviga: bo'sh filtrlar tashlanadi (buildUrl ham tashlaydi, lekin query key barqaror bo'lsin). */
export function toApiQuery<F extends Record<string, string>>(params: ListParams<F>) {
  return {
    page: params.page,
    limit: params.limit,
    ...(params.sortBy ? { sortBy: params.sortBy, sortOrder: params.sortOrder ?? 'asc' } : {}),
    ...params.filters,
  };
}

/** Sahifa tugmalari: `[1, '…', 4, 5, 6, '…', 20]`. Joriy sahifa atrofida `siblings` ta. */
export function pageRange(page: number, totalPages: number, siblings = 1): (number | '…')[] {
  if (totalPages <= 0) return [];
  const current = Math.min(Math.max(page, 1), totalPages);
  // 1, …, [siblings], current, [siblings], …, last — 5 + 2*siblings joy
  if (totalPages <= 5 + siblings * 2) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const start = Math.max(2, current - siblings);
  const end = Math.min(totalPages - 1, current + siblings);
  const range: (number | '…')[] = [1];
  if (start > 2) range.push('…');
  for (let i = start; i <= end; i++) range.push(i);
  if (end < totalPages - 1) range.push('…');
  range.push(totalPages);
  return range;
}
