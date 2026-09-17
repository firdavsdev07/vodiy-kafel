import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import { queryKeys } from '@/shared/query';
import type { CreatePricingRuleBody, DiscountLimit } from './pricing-rules';

/**
 * Mijozning individual narx qoidalari (D-019).
 *
 * 🔒 Filial admini faqat O'ZI qo'ygan qoidalarni ko'radi — bosh admin
 *    qoidalari unga ko'rinmaydi. Buni backend hal qiladi, bu yerda
 *    qo'shimcha filtr YO'Q.
 */
export function useCustomerPricingRules(customerId: string) {
  return useQuery({
    queryKey: queryKeys.pricingRules.list({ customerId }),
    queryFn: ({ signal }) =>
      api.get('/admin/customers/{id}/pricing-rules', { params: { id: customerId }, signal }),
    enabled: Boolean(customerId),
  });
}

/** Qoida o'zgarsa mijoz narxi darhol o'zgaradi — narx jadvali ham eskiradi. */
const invalidates = [queryKeys.pricingRules.all, queryKeys.branchProducts.all];

export function useCreatePricingRule(customerId: string) {
  return useMutation({
    mutationFn: (body: CreatePricingRuleBody) =>
      api.post('/admin/customers/{id}/pricing-rules', { params: { id: customerId }, body }),
    meta: { invalidates },
  });
}

export function useDeletePricingRule(customerId: string) {
  return useMutation({
    mutationFn: (ruleId: string) =>
      api.delete('/admin/customers/{id}/pricing-rules/{ruleId}', {
        params: { id: customerId, ruleId },
      }),
    meta: { invalidates },
  });
}

/**
 * Filial admini uchun chegirma chegarasi — `pricing.branchAdminMaxDiscountPercent`.
 *
 * SUPER_ADMIN'da chegara YO'Q, shuning uchun so'rov ham yuborilmaydi
 * (`GET /admin/settings` unga ochiq, lekin keraksiz so'rov qilmaymiz).
 * Sozlama o'qib bo'lmasa — `0` deb qaraladi: "noma'lum chegara" ni
 * "cheksiz" deb talqin qilish xavfli bo'lardi (backend ham shunday
 * qaraydi: `fallback: 0`).
 */
export function useDiscountLimit(isBranchAdmin: boolean) {
  const settings = useQuery({
    queryKey: queryKeys.settings.lists(),
    queryFn: ({ signal }) => api.get('/admin/settings', { signal }),
    enabled: isBranchAdmin,
    staleTime: 5 * 60_000,
  });

  const limit: DiscountLimit = isBranchAdmin
    ? {
        maxDiscountPercent: readPercent(
          settings.data?.find((s) => s.key === 'pricing.branchAdminMaxDiscountPercent')?.value,
        ),
      }
    : null;

  return { limit, isPending: isBranchAdmin && settings.isPending };
}

function readPercent(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}
