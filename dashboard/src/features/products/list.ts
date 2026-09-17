import type { Schema } from '@/shared/api';
import type { QueryOf } from '@/shared/api/types';
import type { ListParams, ListParamsConfig } from '@/shared/lib/list-params';

export type ProductListItem = Schema<'ProductAdminResponseDto'>;
export type Surface = ProductListItem['surface'];

export type ProductFilters = {
  search: string;
  factoryId: string;
  sizeId: string;
  surface: string;
  isActive: string;
};

/** Backend `sortBy` ro'yxati — ⚠ narx bo'yicha saralash YO'Q (narx filialda). */
export const PRODUCT_SORT_KEYS = ['name', 'createdAt', 'viewCount'] as const;

export const productListConfig: ListParamsConfig<ProductFilters> = {
  filterKeys: ['search', 'factoryId', 'sizeId', 'surface', 'isActive'],
  sortKeys: PRODUCT_SORT_KEYS,
};

const SURFACES: readonly string[] = ['POL', 'DEVOR'] satisfies Surface[];

type ProductsQuery = QueryOf<'/admin/products', 'get'>;

/**
 * URL parametrlari → `GET /admin/products` query. URL'dagi qiymat satr —
 * bu yerda turga keltiriladi; yaroqsizi (qo'lda buzilgan havola) TASHLANADI,
 * backend 400 bermasin.
 */
export function toProductsQuery(params: ListParams<ProductFilters>): ProductsQuery {
  const { search, factoryId, sizeId, surface, isActive } = params.filters;
  const sortBy = PRODUCT_SORT_KEYS.find((k) => k === params.sortBy);
  return {
    page: params.page,
    limit: params.limit,
    ...(sortBy ? { sortBy, sortOrder: params.sortOrder ?? 'asc' } : {}),
    ...(search ? { search } : {}),
    ...(factoryId ? { factoryId } : {}),
    ...(sizeId ? { sizeId } : {}),
    ...(surface && SURFACES.includes(surface) ? { surface: surface as Surface } : {}),
    ...(isActive === 'true' || isActive === 'false' ? { isActive: isActive === 'true' } : {}),
  };
}
