import type { Schema } from '@/shared/api';
import type { QueryOf } from '@/shared/api/types';
import type { ListParams, ListParamsConfig } from '@/shared/lib/list-params';
import { zMoney } from '@/shared/lib/validation';

export type BranchPrice = Schema<'BranchProductAdminResponseDto'>;
export type UpsertPriceBody = Schema<'UpsertBranchProductDto'>;

export type PriceFilters = { branchId: string; productId: string; isActive: string };

/**
 * 🔒 G5: `branchId` URL filtri FAQAT SUPER_ADMIN uchun o'qiladi. Filial
 * admini/menejeri havolaga `?branchId=...` qo'shsa ham — e'tiborga
 * olinmaydi, backend baribir tokendagi filialni beradi.
 */
export function priceListConfig(isSuperAdmin: boolean): ListParamsConfig<PriceFilters> {
  return {
    filterKeys: isSuperAdmin ? ['branchId', 'productId', 'isActive'] : ['productId', 'isActive'],
  };
}

export const superAdminPriceConfig = priceListConfig(true);
export const branchPriceConfig = priceListConfig(false);

export function toPricesQuery(params: ListParams<PriceFilters>): QueryOf<'/admin/branch-products', 'get'> {
  const { branchId, productId, isActive } = params.filters;
  return {
    page: params.page,
    limit: params.limit,
    ...(branchId ? { branchId } : {}),
    ...(productId ? { productId } : {}),
    ...(isActive === 'true' || isActive === 'false' ? { isActive: isActive === 'true' } : {}),
  };
}

/** Backend `@IsPositiveDecimalString(12, 2)` — so'm/m². */
export const zPrice = () => zMoney(12, 2);

/** Inline tahrir: xato matni yoki `null`. */
export function validatePrice(value: string): string | null {
  const result = zPrice().safeParse(value);
  return result.success ? null : (result.error.issues[0]?.message ?? 'Narx noto‘g‘ri');
}

/**
 * Holatni almashtirish — PUT upsert (PATCH faqat narx uchun). PUT narxni
 * ham talab qiladi — joriy narx o'zgarmay yuboriladi. `branchId` — faqat
 * SUPER_ADMIN (filial admini uchun backend uni e'tiborsiz qoldiradi, lekin
 * G5 bo'yicha umuman yubormaymiz).
 */
export function toggleActiveBody(row: BranchPrice, isSuperAdmin: boolean): UpsertPriceBody {
  return {
    ...(isSuperAdmin ? { branchId: row.branch.id } : {}),
    productId: row.product.id,
    pricePerSqm: row.pricePerSqm,
    isActive: !row.isActive,
  };
}
