import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { api, type Schema } from '@/shared/api';
import { toApiQuery, type ListParams, type ListParamsConfig } from '@/shared/lib/list-params';
import { queryKeys } from '@/shared/query';

export type Lead = Schema<'LeadAdminDto'>;
export type LeadStatus = Lead['status'];
export type UpdateLeadBody = Schema<'UpdateLeadDto'>;

export type LeadFilters = { search: string; status: string; branchId: string };

export const LEAD_STATUSES = ['NEW', 'IN_PROGRESS', 'DONE', 'SPAM'] as const satisfies readonly LeadStatus[];

/**
 * 🔒 Filial filtri faqat barcha filialni ko'radiganga (SUPER_ADMIN,
 * MODERATOR). Boshqa rol uchun URL'dagi `branchId` o'qilmaydi — backend
 * baribir o'z filialiga cheklaydi.
 */
export const allBranchesLeadConfig: ListParamsConfig<LeadFilters> = { filterKeys: ['search', 'status', 'branchId'] };
export const branchLeadConfig: ListParamsConfig<LeadFilters> = { filterKeys: ['search', 'status'] };

/** Yangi murojaat sahifani yangilamasdan ko'rinsin (buyurtmalar kabi). */
const REFETCH_INTERVAL = 60_000;

const isLeadStatus = (v: string | undefined): v is LeadStatus => LEAD_STATUSES.includes(v as LeadStatus);

/** URL → API so'rovi. URL'dagi noma'lum holat tashlanadi (400 o'rniga — hammasi). */
export function toLeadsQuery(params: ListParams<LeadFilters>) {
  const { status, ...rest } = toApiQuery(params);
  return { ...rest, ...(isLeadStatus(status) ? { status } : {}) };
}

/** Murojaatlar (T-013) — yangilari birinchi; doira backendda. */
export function useLeads(params: ListParams<LeadFilters>) {
  const query = toLeadsQuery(params);
  return useQuery({
    queryKey: queryKeys.leads.list(query),
    queryFn: ({ signal }) => api.get('/admin/leads', { query, signal }),
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL,
  });
}

/** Menyu nishoni — doiradagi `NEW` murojaatlar soni. */
export function useNewLeadsCount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.leads.newCount,
    queryFn: ({ signal }) => api.get('/admin/leads/new-count', { signal }),
    enabled,
    staleTime: 30_000,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
  });
}

/** Holat va/yoki ichki izoh. Holat o'zgarsa backend `handledBy` ni yozadi. */
export function useUpdateLead() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLeadBody }) => api.patch('/admin/leads/{id}', { params: { id }, body }),
    meta: { invalidates: [queryKeys.leads.all] },
  });
}
