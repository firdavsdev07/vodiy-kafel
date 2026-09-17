import { z } from 'zod';
import type { Schema } from '@/shared/api';
import type { ProductRef } from '@/features/products/similar';
import { MAX_SUPPLY_ITEMS, zPalletCount } from '@/features/supply-orders/create';
import { zRequiredText, zUzPhone } from '@/shared/lib/validation';

export type CreateManualOrderBody = Schema<'CreateManualOrderDto'>;
export type ManualSource = CreateManualOrderBody['source'];
export type PaymentMethodValue = CreateManualOrderBody['paymentMethod'];

/** Backend `MANUAL_ORDER_SOURCES` — WEBSITE qo'lda kiritilmaydi (mijoz o'zi beradi). */
export const MANUAL_SOURCES = ['PHONE', 'TELEGRAM', 'ADMIN'] as const satisfies readonly ManualSource[];
export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD'] as const satisfies readonly PaymentMethodValue[];

export type CustomerPick = { id: string; companyName: string; login: string; branch: { id: string; name: string } };

/**
 * Qo'lda buyurtma (D-028) — telefon/Telegram orqali kelgan.
 * 🔒 Forma HECH QANDAY summa yubormaydi: narx backendda (mijozda — uning filial
 *    narxi va shaxsiy qoidalari; hisobsiz xaridorda — filial bazaviy narxi).
 * 🔒 Filial: mijozda — mijozniki (yuborilmaydi); hisobsiz xaridorda — xodimniki,
 *    faqat SUPER_ADMIN tanlaydi (`branchRequired`, G5).
 */
export function manualOrderSchema(ctx: { branchRequired: boolean }) {
  return z
    .object({
      buyerKind: z.enum(['CUSTOMER', 'GUEST']),
      customer: z.custom<CustomerPick | null>(),
      guestName: z.string().trim().max(150, 'Ko‘pi bilan 150 ta belgi'),
      guestPhone: z.string(),
      branchId: z.string(),
      items: z
        .array(z.object({ product: z.custom<ProductRef>(), pallets: zPalletCount }))
        .min(1, 'Kamida bitta mahsulot qo‘shing')
        .max(MAX_SUPPLY_ITEMS, `Ko‘pi bilan ${MAX_SUPPLY_ITEMS} ta mahsulot`),
      delivery: z.enum(['PICKUP', 'DELIVERY']),
      regionId: z.string(),
      transportTypeId: z.string(),
      source: z.enum(MANUAL_SOURCES),
      paymentMethod: z.enum(PAYMENT_METHODS),
      isUrgent: z.boolean(),
      note: z.string().trim().max(1000, 'Ko‘pi bilan 1000 ta belgi'),
    })
    .superRefine((v, c) => {
      if (v.buyerKind === 'CUSTOMER' && !v.customer) {
        c.addIssue({ code: 'custom', path: ['customer'], message: 'Mijozni tanlang' });
      }
      if (v.buyerKind === 'GUEST') {
        if (!zRequiredText(150).safeParse(v.guestName).success) {
          c.addIssue({ code: 'custom', path: ['guestName'], message: 'Xaridor ismini kiriting' });
        }
        if (!zUzPhone().safeParse(v.guestPhone).success) {
          c.addIssue({ code: 'custom', path: ['guestPhone'], message: 'Raqamni to‘liq kiriting: 90 123 45 67' });
        }
        if (ctx.branchRequired && !v.branchId) {
          c.addIssue({ code: 'custom', path: ['branchId'], message: 'Filialni tanlang' });
        }
      }
      if (v.delivery === 'DELIVERY') {
        if (!v.regionId) c.addIssue({ code: 'custom', path: ['regionId'], message: 'Viloyatni tanlang' });
        if (!v.transportTypeId) c.addIssue({ code: 'custom', path: ['transportTypeId'], message: 'Transportni tanlang' });
      }
    });
}

export type ManualOrderInput = z.input<ReturnType<typeof manualOrderSchema>>;
export type ManualOrderValues = z.output<ReturnType<typeof manualOrderSchema>>;

export const manualOrderDefaults: ManualOrderInput = {
  buyerKind: 'CUSTOMER',
  customer: null,
  guestName: '',
  guestPhone: '',
  branchId: '',
  items: [],
  delivery: 'PICKUP',
  regionId: '',
  transportTypeId: '',
  source: 'PHONE',
  paymentMethod: 'CASH',
  isUrgent: false,
  note: '',
};

/**
 * Forma → so'rov. Xaridorning faqat BIR turi ketadi (backend: ikkalasi — 400).
 * Olib ketishda viloyat/transport yuborilmaydi. Mijozda `branchId` yuborilmaydi.
 */
export function toManualOrderBody(v: ManualOrderValues): CreateManualOrderBody {
  const buyer =
    v.buyerKind === 'CUSTOMER' && v.customer
      ? { customerId: v.customer.id }
      : {
          guestName: v.guestName,
          // zUzPhone → +998901234567 (schema allaqachon tekshirgan)
          guestPhone: zUzPhone().parse(v.guestPhone),
          ...(v.branchId ? { branchId: v.branchId } : {}),
        };
  return {
    items: v.items.map((i) => ({ productId: i.product.id, pallets: Number(i.pallets) })),
    ...buyer,
    ...(v.delivery === 'DELIVERY' ? { regionId: v.regionId, transportTypeId: v.transportTypeId } : {}),
    source: v.source,
    paymentMethod: v.paymentMethod,
    ...(v.isUrgent ? { isUrgent: true } : {}),
    ...(v.note ? { note: v.note } : {}),
  };
}
