import { z } from 'zod';
import type { Schema } from '@/shared/api';
import type { ProductRef } from '@/features/products/similar';

export type CreateSupplyOrderBody = Schema<'CreateSupplyOrderDto'>;

/** Backend `CreateSupplyOrderDto`: 1…50 qator, paddon 1…100 000 (QuoteItemDto). */
export const MAX_SUPPLY_ITEMS = 50;
export const MAX_PALLETS_PER_ITEM = 100_000;

/** Paddon soni — butun, 1…100 000 (QuoteItemDto). Qo'lda buyurtma (D-028) ham shuni ishlatadi. */
export const zPalletCount = z
  .string()
  .trim()
  .min(1, 'Paddon sonini kiriting')
  .regex(/^\d+$/, 'Butun son')
  .refine((v) => {
    // Butun son, 6 xonagacha — `Number` bu yerda xavfsiz (pul emas, G6 tegmaydi)
    const n = Number(v);
    return n >= 1 && n <= MAX_PALLETS_PER_ITEM;
  }, '1 dan 100 000 gacha');

export interface SupplyFormContext {
  /** Faol markaziy omborlar bir nechta bo'lsa — tanlash MAJBURIY (backend 400). */
  centralCount: number;
}

/**
 * Ta'minot buyurtmasi formasi (D-032). 🔒 Narx va summa YUBORILMAYDI — backend
 * markaziy ombor narxi va tarifidan o'zi hisoblaydi (G1). Buyurtma bergan
 * filial — tokendan (G5), formada yo'q.
 */
export function supplyOrderSchema(ctx: SupplyFormContext) {
  return z
    .object({
      items: z
        .array(z.object({ product: z.custom<ProductRef>(), pallets: zPalletCount }))
        .min(1, 'Kamida bitta mahsulot qo‘shing')
        .max(MAX_SUPPLY_ITEMS, `Ko‘pi bilan ${MAX_SUPPLY_ITEMS} ta mahsulot`),
      delivery: z.enum(['PICKUP', 'DELIVERY']),
      regionId: z.string(),
      transportTypeId: z.string(),
      centralBranchId: z.string(),
      note: z.string().trim().max(1000, 'Ko‘pi bilan 1000 ta belgi'),
    })
    .superRefine((v, c) => {
      if (v.delivery === 'DELIVERY') {
        if (!v.regionId) c.addIssue({ code: 'custom', path: ['regionId'], message: 'Viloyatni tanlang' });
        if (!v.transportTypeId) c.addIssue({ code: 'custom', path: ['transportTypeId'], message: 'Transportni tanlang' });
      }
      if (ctx.centralCount > 1 && !v.centralBranchId) {
        c.addIssue({ code: 'custom', path: ['centralBranchId'], message: 'Markaziy omborni tanlang' });
      }
    });
}

export type SupplyOrderInput = z.input<ReturnType<typeof supplyOrderSchema>>;
export type SupplyOrderValues = z.output<ReturnType<typeof supplyOrderSchema>>;

export const supplyOrderDefaults: SupplyOrderInput = {
  items: [],
  delivery: 'PICKUP',
  regionId: '',
  transportTypeId: '',
  centralBranchId: '',
  note: '',
};

/** Mahsulot allaqachon qatorda bo'lsa — ikkinchi marta qo'shilmaydi (paddon sonini o'sha qatorda o'zgartiring). */
export function duplicateReason(items: readonly { product: ProductRef }[], candidate: ProductRef): string | null {
  return items.some((i) => i.product.id === candidate.id) ? 'Qo‘shilgan' : null;
}

/**
 * Forma → so'rov. Olib ketishda viloyat/transport YUBORILMAYDI (backend:
 * "ikkalasi yoki hech biri"). Markaziy ombor bitta bo'lsa — yuborilmaydi.
 */
export function toCreateSupplyBody(v: SupplyOrderValues): CreateSupplyOrderBody {
  return {
    items: v.items.map((i) => ({ productId: i.product.id, pallets: Number(i.pallets) })),
    ...(v.delivery === 'DELIVERY' ? { regionId: v.regionId, transportTypeId: v.transportTypeId } : {}),
    ...(v.centralBranchId ? { centralBranchId: v.centralBranchId } : {}),
    ...(v.note ? { note: v.note } : {}),
  };
}
