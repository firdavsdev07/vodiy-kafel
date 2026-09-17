import { useQuery } from '@tanstack/react-query';
import { api, type Page, type Schema } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';

export type CatalogItem = Schema<'CustomerCatalogItemDto'>;
export type CatalogProduct = Schema<'CustomerCatalogDetailDto'>;

/** URL'dagi filtrlar — ochiq katalog filtrlari bilan bir xil (D-052). */
export type CatalogFilters = {
  search: string;
  factoryId: string;
  sizeId: string;
  surface: string;
};

/** Backend `ProductSortField` — narx bo'yicha saralash YO'Q (hisoblanadi, bazada emas). */
export const CATALOG_SORT_KEYS = ['name', 'createdAt', 'viewCount'] as const;

type Surface = CatalogItem['surface'];

function toQuery(params: ListParams<CatalogFilters>) {
  const { search, factoryId, sizeId, surface } = params.filters;
  return {
    page: params.page,
    limit: params.limit,
    ...(params.sortBy ? { sortBy: params.sortBy as (typeof CATALOG_SORT_KEYS)[number], sortOrder: params.sortOrder ?? 'asc' } : {}),
    ...(search ? { search } : {}),
    ...(factoryId ? { factoryId } : {}),
    ...(sizeId ? { sizeId } : {}),
    // Begona qiymat (URL qo'lda tahrirlangan) yuborilmaydi — backend 400 bermasin
    ...(surface === 'POL' || surface === 'DEVOR' ? { surface: surface as Surface } : {}),
  };
}

/**
 * Kabinet katalogi — `GET /me/catalog` (D-052, api B-064).
 *
 * ⚠ Bu OCHIQ `GET /products` EMAS: javobda mijozga tegishli yakuniy narx
 *   va uch darajali zaxira holati bor, ro'yxatda esa faqat mijoz
 *   filialida sotiladigan mahsulotlar.
 *
 * 🔒 Filial so'rovda YUBORILMAYDI — u tokendan (G5).
 */
export function useCabinetCatalog(params: ListParams<CatalogFilters>) {
  const query = toQuery(params);
  return useQuery({
    queryKey: queryKeys.cabinet.catalog.list(query),
    queryFn: ({ signal }) =>
      api.get('/me/catalog', { query, signal }) as Promise<Page<CatalogItem>>,
  });
}

/** Mahsulot sahifasi — slug bo'yicha (D-052). */
export function useCabinetProduct(slug: string) {
  return useQuery({
    queryKey: queryKeys.cabinet.catalog.detail(slug),
    queryFn: ({ signal }) => api.get('/me/catalog/{slug}', { params: { slug }, signal }),
    enabled: slug !== '',
  });
}

/**
 * Filtr ro'yxatlari — zavodlar va o'lchamlar OCHIQ endpointlardan
 * (`GET /factories`, `GET /sizes`): ular narx bermaydi, mijoz tokeni
 * bilan ham ishlaydi. ⚠ `/admin/*` variantlari mijozga 403 beradi.
 */
export function useCatalogFilterOptions() {
  const factories = useQuery({
    queryKey: ['me', 'factories'] as const,
    queryFn: ({ signal }) => api.get('/factories', { signal }),
    staleTime: 10 * 60_000,
  });
  const sizes = useQuery({
    queryKey: ['me', 'sizes'] as const,
    queryFn: ({ signal }) => api.get('/sizes', { signal }),
    staleTime: 10 * 60_000,
  });
  return { factories, sizes };
}
