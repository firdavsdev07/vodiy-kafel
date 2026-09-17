import type { Schema } from '@/shared/api';
import type { QueryOf } from '@/shared/api/types';
import type { ListParams, ListParamsConfig } from '@/shared/lib/list-params';
import type { OrderSource, OrderStatus, PaymentStatus } from '@/shared/lib/status-tone';

export type OrderListItem = Schema<'AdminOrderListItemDto'>;

export type OrderFilters = {
  search: string;
  status: string;
  source: string;
  isUrgent: string;
  paymentStatus: string;
  branchId: string;
  managerId: string;
  /** `YYYY-MM-DD`, Toshkent kuni — shu kundan (kiritiladi) */
  dateFrom: string;
  /** `YYYY-MM-DD`, Toshkent kuni — shu kungacha (KIRITILADI; API ga ertasi kun ketadi) */
  dateTo: string;
};

const COMMON_KEYS = ['search', 'status', 'source', 'isUrgent', 'paymentStatus', 'managerId', 'dateFrom', 'dateTo'] as const;

/**
 * 🔒 Filial filtri FAQAT SUPER_ADMIN ga (G5). Boshqa rol uchun URL'dagi
 * `branchId` umuman o'qilmaydi — backend baribir o'z filialiga cheklaydi.
 * Saralash backendda qat'iy (yangilari oldin) — `sortKeys` yo'q.
 */
export const superAdminOrderConfig: ListParamsConfig<OrderFilters> = {
  filterKeys: [...COMMON_KEYS, 'branchId'],
};
export const branchOrderConfig: ListParamsConfig<OrderFilters> = {
  filterKeys: COMMON_KEYS,
};

export const ORDER_STATUSES = [
  'NEW',
  'SEARCHING_TRANSPORT',
  'LOADING',
  'DELIVERING',
  'DELIVERED',
  'CANCELLED',
] as const satisfies readonly OrderStatus[];
export const ORDER_SOURCES = ['WEBSITE', 'TELEGRAM', 'PHONE', 'ADMIN'] as const satisfies readonly OrderSource[];
export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'CANCELLED'] as const satisfies readonly PaymentStatus[];

const pick = <V extends string>(allowed: readonly V[], value: string | undefined): V | undefined =>
  allowed.find((v) => v === value);

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Toshkent (UTC+5, yozgi vaqt yo'q) — G9. */
const TASHKENT_OFFSET = '+05:00';

/**
 * `2026-09-17` → `2026-09-17T00:00:00+05:00`. Backend `new Date()` bilan
 * o'qiydi: sof sana UTC yarim tuni bo'lardi va Toshkentda 00:00–05:00
 * orasidagi buyurtmalar "kechagi kun"ga tushib qolardi.
 */
export function tashkentDayStart(day: string): string | undefined {
  if (!DAY_RE.test(day)) return undefined;
  const d = new Date(`${day}T00:00:00Z`);
  // "2026-02-30" kabi mavjud bo'lmagan sanani tashlaymiz
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day) return undefined;
  return `${day}T00:00:00${TASHKENT_OFFSET}`;
}

/** Keyingi kun (`2026-09-30` → `2026-10-01`). Sof kalendar hisobi — soat mintaqasidan qat'iy nazar. */
export function nextDay(day: string): string | undefined {
  if (!tashkentDayStart(day)) return undefined;
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function toOrdersQuery(params: ListParams<OrderFilters>): QueryOf<'/admin/orders', 'get'> {
  const f = params.filters;
  const status = pick(ORDER_STATUSES, f.status);
  const source = pick(ORDER_SOURCES, f.source);
  const paymentStatus = pick(PAYMENT_STATUSES, f.paymentStatus);
  const isUrgent = f.isUrgent === 'true' ? true : f.isUrgent === 'false' ? false : undefined;
  // Teskari oraliq backendda 400 — so'rov yuborilmaydi, sahifa ogohlantiradi
  const range = isDateRangeInvalid(f) ? {} : f;
  const dateFrom = range.dateFrom ? tashkentDayStart(range.dateFrom) : undefined;
  // Xodim "17-gacha" deganda 17-kun HAM kiradi; backend `dateTo` ni kiritmaydi → ertasi kun
  const toDay = range.dateTo ? nextDay(range.dateTo) : undefined;
  const dateTo = toDay ? tashkentDayStart(toDay) : undefined;

  return {
    page: params.page,
    limit: params.limit,
    ...(f.search ? { search: f.search } : {}),
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(isUrgent === undefined ? {} : { isUrgent }),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(f.branchId ? { branchId: f.branchId } : {}),
    ...(f.managerId ? { managerId: f.managerId } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };
}

/** Sana oralig'i teskari — backend 400 qaytaradi, forma oldindan aytadi. */
export function isDateRangeInvalid(filters: Partial<OrderFilters>): boolean {
  const { dateFrom, dateTo } = filters;
  return Boolean(dateFrom && dateTo && tashkentDayStart(dateFrom) && tashkentDayStart(dateTo) && dateFrom > dateTo);
}

/**
 * Tez filtrlar (D-024). Har biri — oddiy filtrlar to'plami: bosilganda o'sha
 * filtrlar qo'yiladi, qayta bosilganda olib tashlanadi. Alohida holat yo'q —
 * URL yagona manba.
 */
export type QuickFilterId = 'new' | 'urgent' | 'unpaid' | 'mine';

export interface QuickFilter {
  id: QuickFilterId;
  label: string;
  filters: Partial<OrderFilters>;
}

export function quickFilters(me: { id: string; isManager: boolean } | null): QuickFilter[] {
  const list: QuickFilter[] = [
    { id: 'new', label: 'Yangi', filters: { status: 'NEW' } },
    { id: 'urgent', label: 'Tezkor', filters: { isUrgent: 'true' } },
    // "To'lanmagan" — kutilayotgan to'lovi bor buyurtmalar (backend: payments.some.status)
    { id: 'unpaid', label: 'To‘lanmagan', filters: { paymentStatus: 'PENDING' } },
  ];
  // Buyurtma faqat MENEJERGA biriktiriladi — boshqa rolda bu tugma doim bo'sh natija berardi
  if (me?.isManager) list.push({ id: 'mine', label: 'Menga biriktirilgan', filters: { managerId: me.id } });
  return list;
}

export function isQuickFilterActive(quick: QuickFilter, current: Partial<OrderFilters>): boolean {
  return Object.entries(quick.filters).every(([k, v]) => current[k as keyof OrderFilters] === v);
}

/** Bosilganda: faol bo'lsa — o'chiradi, bo'lmasa — qo'yadi. Boshqa filtrlar tegilmaydi. */
export function toggleQuickFilter(quick: QuickFilter, current: Partial<OrderFilters>): Partial<Record<keyof OrderFilters, string | undefined>> {
  const active = isQuickFilterActive(quick, current);
  return Object.fromEntries(Object.entries(quick.filters).map(([k, v]) => [k, active ? undefined : v]));
}
