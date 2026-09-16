import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api';
import type { ListParams } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';
import type { CreateCustomerBody } from './customer-form';
import type { UpdateCustomerBody } from './customer-profile';
import { toCustomersQuery, type CustomerFilters } from './list';

/** Optom mijozlar (D-020). Saralash backendda qat'iy (yangilari oldin) — sortBy yuborilmaydi. */
export function useCustomers(params: ListParams<CustomerFilters>) {
  const query = toCustomersQuery(params);
  return useQuery({
    queryKey: queryKeys.customers.list(query),
    queryFn: ({ signal }) => api.get('/admin/customers', { query, signal }),
    placeholderData: keepPreviousData,
  });
}

/**
 * 🔒 Yaratish/parol tiklash javobida VAQTINCHALIK PAROL bor. `gcTime: 0` +
 * chaqiruvchi `mutateAsync` natijasini oladi va darhol `reset()` qiladi —
 * parol MutationCache'da qolib ketmaydi.
 */
export function useCreateCustomer() {
  return useMutation({
    mutationFn: (body: CreateCustomerBody) => api.post('/admin/customers', { body }),
    gcTime: 0,
    meta: { invalidates: [queryKeys.customers.all] },
  });
}

export function useResetCustomerPassword() {
  return useMutation({
    mutationFn: (id: string) => api.post('/admin/customers/{id}/reset-password', { params: { id } }),
    gcTime: 0,
    meta: { invalidates: [queryKeys.customers.all] },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: ({ signal }) => api.get('/admin/customers/{id}', { params: { id }, signal }),
  });
}

export function useUpdateCustomer(id: string) {
  return useMutation({
    mutationFn: (body: UpdateCustomerBody) =>
      // ⚠ B-059: inn/managerId turi generatsiyada noto'g'ri
      api.patch('/admin/customers/{id}', { params: { id }, body: body as never }),
    meta: { invalidates: [queryKeys.customers.all] },
  });
}

/** `false` — mijoz kira olmaydi va buyurtma bera olmaydi; tarix saqlanadi. */
export function useSetCustomerActive(id: string) {
  return useMutation({
    mutationFn: (isActive: boolean) => api.patch('/admin/customers/{id}/active', { params: { id }, body: { isActive } }),
    meta: { invalidates: [queryKeys.customers.all] },
  });
}

/** Filialning faol menejerlari — biriktirish uchun (SUPER_ADMIN, BRANCH_ADMIN). */
export function useBranchManagers(branchId: string, enabled: boolean) {
  const query = { branchId, isActive: true };
  return useQuery({
    queryKey: queryKeys.managers.list(query),
    queryFn: ({ signal }) => api.get('/admin/managers', { query, signal }),
    enabled: enabled && branchId !== '',
    staleTime: 5 * 60_000,
  });
}
