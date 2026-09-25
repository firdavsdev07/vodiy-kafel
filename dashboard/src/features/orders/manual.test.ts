import { describe, expect, it } from 'vitest';
import type { ProductRef } from '@/features/products/similar';
import { manualOrderDefaults, manualOrderSchema, toManualOrderBody, type ManualOrderInput } from './manual';

const item = { product: { id: 'p1', name: 'Granit' } as ProductRef, pallets: '3' };
const customer = { id: 'c1', companyName: 'Qurilish MChJ', login: 'qurilish', branch: { id: 'b1', name: 'Farg‘ona' } };
const parse = (over: Partial<ManualOrderInput>, branchRequired = false) =>
  manualOrderSchema({ branchRequired }).safeParse({ ...manualOrderDefaults, items: [item], ...over });

describe('qo‘lda buyurtma (D-028)', () => {
  it('mijoz: faqat customerId; filial va mehmon maydonlari yuborilmaydi; summa HECH QACHON', () => {
    const r = parse({ customer, guestName: 'Aziz', guestPhone: '901234567', branchId: 'b9' });
    expect(r.success && toManualOrderBody(r.data)).toEqual({
      items: [{ productId: 'p1', pallets: 3 }],
      customerId: 'c1',
      source: 'PHONE',
      paymentMethod: 'CASH',
    });
  });

  it('mijoz tanlanmasa — xato', () => {
    expect(parse({}).success).toBe(false);
  });

  it('hisobsiz xaridor: ism + telefon (+998 ga keltiriladi); customerId yuborilmaydi', () => {
    expect(parse({ buyerKind: 'GUEST', guestName: '', guestPhone: '901234567' }).success).toBe(false);
    expect(parse({ buyerKind: 'GUEST', guestName: 'Aziz', guestPhone: '12' }).success).toBe(false);
    const r = parse({ buyerKind: 'GUEST', customer, guestName: ' Aziz aka ', guestPhone: '90 123 45 67', source: 'TELEGRAM', isUrgent: true, note: ' tez ' });
    expect(r.success && toManualOrderBody(r.data)).toEqual({
      items: [{ productId: 'p1', pallets: 3 }],
      guestName: 'Aziz aka',
      guestPhone: '+998901234567',
      source: 'TELEGRAM',
      paymentMethod: 'CASH',
      isUrgent: true,
      note: 'tez',
    });
  });

  it('🔒 SUPER_ADMIN hisobsiz xaridorda filialni tanlashi shart va u yuboriladi', () => {
    expect(parse({ buyerKind: 'GUEST', guestName: 'Aziz', guestPhone: '901234567' }, true).success).toBe(false);
    const r = parse({ buyerKind: 'GUEST', guestName: 'Aziz', guestPhone: '901234567', branchId: 'b2' }, true);
    expect(r.success && toManualOrderBody(r.data).branchId).toBe('b2');
  });

  it('yetkazib berish: viloyat va transport birga', () => {
    expect(parse({ customer, delivery: 'DELIVERY', regionId: 'r1' }).success).toBe(false);
    const r = parse({ customer, delivery: 'DELIVERY', regionId: 'r1', transportTypeId: 't1', paymentMethod: 'BANK_TRANSFER' });
    expect(r.success && toManualOrderBody(r.data)).toMatchObject({ regionId: 'r1', transportTypeId: 't1', paymentMethod: 'BANK_TRANSFER' });
  });

  it('🔒 T-004: filial xodimi viloyat YUBORMAYDI — faqat yetkazib berishni so‘raydi', () => {
    const r = manualOrderSchema({ branchRequired: false, canRoute: false }).safeParse({
      ...manualOrderDefaults,
      items: [item],
      customer,
      delivery: 'DELIVERY',
      regionId: 'r1',
      transportTypeId: 't1',
    });
    expect(r.success).toBe(true);
    const body = r.success ? toManualOrderBody(r.data, false) : null;
    expect(body).toMatchObject({ deliveryRequested: true, transportTypeId: 't1' });
    expect(body).not.toHaveProperty('regionId');

    // Transport ixtiyoriy — tanlanmasa faqat so'rov ketadi
    const bare = manualOrderSchema({ branchRequired: false, canRoute: false }).safeParse({
      ...manualOrderDefaults,
      items: [item],
      customer,
      delivery: 'DELIVERY',
    });
    expect(bare.success && toManualOrderBody(bare.data, false)).toMatchObject({ deliveryRequested: true });
    expect(bare.success && toManualOrderBody(bare.data, false)).not.toHaveProperty('transportTypeId');
  });

  it('WEBSITE manbasi qo‘lda tanlanmaydi', () => {
    expect(parse({ customer, source: 'WEBSITE' as never }).success).toBe(false);
  });
});
