import { z } from 'zod';
import type { Schema } from '@/shared/api';
import type { QueryOf } from '@/shared/api/types';
import type { ListParams, ListParamsConfig } from '@/shared/lib/list-params';
import { zMoney, zRequiredText } from '@/shared/lib/validation';
import type { TransactionType } from '@/shared/lib/status-tone';

export type AccountSummary = Schema<'AccountSummaryDto'>;
export type AccountTransaction = Schema<'AccountTransactionAdminDto'>;
export type CreateTransactionBody = Schema<'CreateAccountTransactionDto'>;

export type TransactionFilters = { type: string };

/** Tranzaksiyalar ro'yxati (D-023). Saralash backendda qat'iy — yangilari oldin. */
export const transactionListConfig: ListParamsConfig<TransactionFilters> = {
  filterKeys: ['type'],
};

const TYPES = ['DEBT', 'PAYMENT', 'ADJUSTMENT'] as const satisfies readonly TransactionType[];

export function toTransactionsQuery(
  params: ListParams<TransactionFilters>,
): QueryOf<'/admin/customers/{id}/transactions', 'get'> {
  const type = TYPES.find((t) => t === params.filters.type);
  return { page: params.page, limit: params.limit, ...(type ? { type } : {}) };
}

/**
 * Tuzatish yo'nalishi. Xodim ishorani QO'LDA yozmaydi (`-150000` yozishni
 * unutish = teskari natija) — o'rniga "qarzni oshirish / kamaytirish"
 * tanlaydi, ishorani `toCreateTransactionBody` qo'yadi.
 */
export type AdjustmentDirection = 'INCREASE' | 'DECREASE';

export const adjustmentDirectionLabel = {
  INCREASE: 'Qarzni oshirish (+)',
  DECREASE: 'Qarzni kamaytirish (−)',
} as const satisfies Record<AdjustmentDirection, string>;

/** Qo'lda yozuv turi — nima bo'lishini xodimga tushuntiradi. */
export const manualTypeHint = {
  DEBT: 'Buyurtmadan tashqari qarz (masalan eski qoldiq). Balans oshadi.',
  PAYMENT: 'Buyurtmadan tashqari to‘lov qabul qilindi (naqd, o‘tkazma). Balans kamayadi.',
  ADJUSTMENT: 'Xato yozuvni qaytarish yoki tuzatish. Yo‘nalishini tanlang.',
} as const satisfies Record<TransactionType, string>;

/**
 * Backend `CreateAccountTransactionDto`: summa — `IsNonZeroDecimalString(12, 2)`,
 * izoh 3…500 belgi (majburiy — audit). DEBT/PAYMENT summasi MUSBAT yuboriladi.
 */
export const transactionSchema = z.object({
  type: z.enum(TYPES),
  direction: z.enum(['INCREASE', 'DECREASE']),
  amount: zMoney(12, 2),
  note: zRequiredText(500).min(3, 'Sababni kamida 3 ta belgida yozing'),
});

export type TransactionInput = z.input<typeof transactionSchema>;
export type TransactionValues = z.output<typeof transactionSchema>;

export const transactionDefaults: TransactionInput = {
  type: 'PAYMENT',
  direction: 'DECREASE',
  amount: '',
  note: '',
};

/** Forma → so'rov tanasi. Ishora FAQAT tuzatishda va faqat shu yerda qo'yiladi. */
export function toCreateTransactionBody(v: TransactionValues): CreateTransactionBody {
  const negative = v.type === 'ADJUSTMENT' && v.direction === 'DECREASE';
  return { type: v.type, amount: negative ? `-${v.amount}` : v.amount, note: v.note };
}

/**
 * Yozuv balansga qaysi tomonga ta'sir qiladi — tasdiq oynasi uchun.
 * Backend ishorasi bilan bir xil: DEBT +, PAYMENT −, ADJUSTMENT — tanlangan.
 */
export function balanceEffect(v: Pick<TransactionValues, 'type' | 'direction'>): 'increase' | 'decrease' {
  if (v.type === 'DEBT') return 'increase';
  if (v.type === 'PAYMENT') return 'decrease';
  return v.direction === 'INCREASE' ? 'increase' : 'decrease';
}

/** `"-8000000"` → `false`. Satr ustida (G6) — `Number()` yo'q. */
export function isNegativeAmount(amount: string): boolean {
  return amount.trim().startsWith('-');
}
