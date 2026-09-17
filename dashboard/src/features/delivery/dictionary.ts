import { z } from 'zod';
import type { Schema } from '@/shared/api';
import { zRequiredText } from '@/shared/lib/validation';

export type Region = Schema<'RegionAdminDto'>;
export type TransportType = Schema<'TransportTypeAdminDto'>;

/**
 * Yetkazib berish ma'lumotnomalari (D-037 viloyat, D-038 transport turi) —
 * bitta naqsh: nom (noyob), tartib, faollik (soft delete). Transport turida
 * qo'shimcha — sig'im (paddon).
 * ⚠ Ro'yxatlar HARDCODE EMAS (api/CLAUDE.md §5) — hammasi API'dan.
 */
export type DictionaryItem = { id: string; name: string; sortOrder: number; isActive: boolean; capacityPallets?: number };

export function dictionarySchema(opts: { nameMax: number; withCapacity: boolean }) {
  return z.object({
    name: zRequiredText(opts.nameMax),
    sortOrder: z.string().trim().regex(/^\d{1,6}$/, 'Butun son (0 yoki katta)').transform(Number),
    capacityPallets: opts.withCapacity
      ? z
          .string()
          .trim()
          .regex(/^\d{1,4}$/, 'Butun son')
          .transform(Number)
          .refine((n) => n >= 1 && n <= 1000, '1 dan 1000 gacha paddon')
      : z.string().transform(() => undefined),
  });
}

export type DictionaryFormInput = z.input<ReturnType<typeof dictionarySchema>>;
export type DictionaryFormValues = z.output<ReturnType<typeof dictionarySchema>>;

export function dictionaryDefaults(item: DictionaryItem | undefined, defaultSortOrder: number): DictionaryFormInput {
  return {
    name: item?.name ?? '',
    sortOrder: String(item?.sortOrder ?? defaultSortOrder),
    capacityPallets: item?.capacityPallets === undefined ? '' : String(item.capacityPallets),
  };
}

export type DictionaryBody = { name?: string; sortOrder?: number; capacityPallets?: number };

/** Yaratish tanasi. Sig'im faqat transport turida. */
export function toCreateDictionaryBody(v: DictionaryFormValues): Required<Pick<DictionaryBody, 'name' | 'sortOrder'>> & DictionaryBody {
  return { name: v.name, sortOrder: v.sortOrder, ...(v.capacityPallets === undefined ? {} : { capacityPallets: v.capacityPallets }) };
}

/** PATCH — faqat o'zgarganlar. */
export function toUpdateDictionaryBody(v: DictionaryFormValues, item: DictionaryItem): DictionaryBody {
  const body: DictionaryBody = {};
  if (v.name !== item.name) body.name = v.name;
  if (v.sortOrder !== item.sortOrder) body.sortOrder = v.sortOrder;
  if (v.capacityPallets !== undefined && v.capacityPallets !== item.capacityPallets) body.capacityPallets = v.capacityPallets;
  return body;
}

export function nextSortOrder(items: readonly DictionaryItem[] | undefined): number {
  return (items ?? []).reduce((max, i) => Math.max(max, i.sortOrder + 1), 0);
}
