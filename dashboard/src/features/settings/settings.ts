import { z } from 'zod';
import type { Schema } from '@/shared/api';
import { zRequiredText } from '@/shared/lib/validation';

export type Setting = Schema<'SettingAdminDto'>;
export type SettingKey = Setting['key'];
export type UpdateSettingBody = Schema<'UpdateSettingDto'>;

/**
 * Sozlamalar (D-040). Backend FAQAT shu uch kalitni taniydi — frontend yangi
 * kalit yarata olmaydi. Qoidalar `api/src/modules/settings/setting-definitions.ts`
 * bilan AYNAN bir xil (farq qilsa backend 400 qaytaradi va matni ko'rsatiladi).
 */
export const SETTING_KEYS = [
  'stock.lowThresholdPallets',
  'payment.requisites',
  'pricing.branchAdminMaxDiscountPercent',
] as const satisfies readonly SettingKey[];

export interface Requisites {
  bank: string;
  mfo: string;
  account: string;
  inn: string;
  name: string;
}

// ── API qiymatini o'qish (`value` turi generatsiyada erkin JSON) ──

/** Son emas / noto'g'ri — `null` (UI "o'qib bo'lmadi" deydi, taxmin qilmaydi). */
export function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readRequisites(value: unknown): Requisites | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const fields = ['bank', 'mfo', 'account', 'inn', 'name'] as const;
  return fields.every((f) => typeof v[f] === 'string') ? (v as unknown as Requisites) : null;
}

// ── Forma sxemalari ──

const digits = (label: string, count: number) =>
  z.string().trim().regex(new RegExp(`^\\d{${count}}$`), `${label} — aynan ${count} ta raqam`);

export const thresholdSchema = z.object({
  value: z
    .string()
    .trim()
    .regex(/^\d{1,7}$/, 'Butun son (0 yoki katta)')
    .transform(Number)
    .refine((n) => n <= 1_000_000, '1 000 000 dan katta bo‘lmasin'),
});

export const percentSchema = z.object({
  value: z
    .string()
    .trim()
    .transform((v) => v.replace(',', '.'))
    .refine((v) => /^\d{1,3}(\.\d{1,2})?$/.test(v), 'Son kiriting (masalan 15 yoki 7.5)')
    .transform(Number)
    .refine((n) => n >= 0 && n <= 100, '0 dan 100 gacha'),
});

export const requisitesSchema = z.object({
  bank: zRequiredText(200),
  mfo: digits('MFO', 5),
  account: digits('Hisob raqam', 20),
  inn: digits('INN', 9),
  name: zRequiredText(200),
});

export type RequisitesInput = z.input<typeof requisitesSchema>;

export function requisitesDefaults(value: unknown): RequisitesInput {
  const r = readRequisites(value);
  return { bank: r?.bank ?? '', mfo: r?.mfo ?? '', account: r?.account ?? '', inn: r?.inn ?? '', name: r?.name ?? '' };
}

/** Hisob raqamini o'qishga qulay: `20208 00090 01234 56789`. Faqat ko'rsatish uchun. */
export function formatAccount(account: string): string {
  return account.replace(/(\d{5})(?=\d)/g, '$1 ');
}
