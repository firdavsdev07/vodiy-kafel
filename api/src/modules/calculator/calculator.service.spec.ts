import { BadRequestException } from '@nestjs/common';
import {
  PricingDomain,
  PricingScope,
  PricingValueType,
} from '../../common/enums';
import {
  PricingResolverService,
  type PricingRuleInput,
} from '../pricing/pricing-resolver.service';
import {
  CalculatorService,
  type CalculatorInput,
  type CalculatorItemInput,
} from './calculator.service';

/**
 * B-026 · hisoblash yadrosi — sof funksiya. Haqiqiy PricingResolverService
 * bilan (u ham sof): narx zanjiri kalkulyator ICHIDA qo'llanishi tekshiriladi.
 */
describe('CalculatorService (B-026)', () => {
  const service = new CalculatorService(new PricingResolverService());

  const tile = (
    over: Partial<CalculatorItemInput> = {},
  ): CalculatorItemInput => ({
    productId: 'p1',
    factoryId: 'f1',
    pallets: 10,
    sqmPerPallet: '1.44',
    weightPerPallet: '32.5',
    basePricePerSqm: '85000',
    ...over,
  });

  const input = (over: Partial<CalculatorInput> = {}): CalculatorInput => ({
    items: [tile()],
    transport: null,
    productRules: [],
    transportRules: [],
    ...over,
  });

  const fura = {
    branchRegionTariffId: 't1',
    capacityPallets: 20,
    basePricePerVehicle: '12000000',
  };

  const rule = (over: Partial<PricingRuleInput>): PricingRuleInput => ({
    id: 'r1',
    domain: PricingDomain.PRODUCT,
    scope: PricingScope.ALL,
    productId: null,
    factoryId: null,
    branchRegionTariffId: null,
    type: PricingValueType.PERCENT,
    value: -10,
    ...over,
  });

  describe('formulalar', () => {
    it('bitta mahsulot, transportsiz', () => {
      const result = service.calculate(input());

      expect(result.items[0].sqm.toString()).toBe('14.4');
      expect(result.items[0].weightKg.toString()).toBe('325');
      expect(result.items[0].pricePerSqm.toString()).toBe('85000');
      expect(result.items[0].lineTotal.toString()).toBe('1224000');
      expect(result).toMatchObject({ totalPallets: 10, transport: null });
      expect(result.itemsTotal.toString()).toBe('1224000');
      expect(result.deliveryTotal.toString()).toBe('0');
      expect(result.grandTotal.toString()).toBe('1224000');
    });

    it('bir nechta mahsulot + transport: yig‘indilar va grandTotal = items + delivery', () => {
      const result = service.calculate(
        input({
          items: [
            tile(),
            tile({
              productId: 'p2',
              pallets: 5,
              sqmPerPallet: '1.08',
              weightPerPallet: '24',
              basePricePerSqm: '62000',
            }),
          ],
          transport: fura,
        }),
      );

      // 5 × 1.08 = 5.4 m² × 62 000 = 334 800
      expect(result.itemsTotal.toString()).toBe('1558800');
      expect(result.totalSqm.toString()).toBe('19.8');
      expect(result.totalWeightKg.toString()).toBe('445');
      expect(result.totalPallets).toBe(15);
      expect(result.transport).toMatchObject({
        vehicleCount: 1,
        capacityPallets: 20,
      });
      expect(result.deliveryTotal.toString()).toBe('12000000');
      expect(result.grandTotal.toString()).toBe('13558800');
    });
  });

  describe('transport soni — ceil', () => {
    it.each([
      [1, 1],
      [19, 1],
      [20, 1],
      [21, 2],
      [40, 2],
      [41, 3],
    ])('%i paddon, sig‘im 20 → %i mashina', (pallets, vehicles) => {
      const result = service.calculate(
        input({ items: [tile({ pallets })], transport: fura }),
      );
      expect(result.transport?.vehicleCount).toBe(vehicles);
      expect(result.deliveryTotal.toString()).toBe(
        String(12_000_000 * vehicles),
      );
    });

    it('paddonlar mahsulotlar bo‘yicha jamlanadi (har biri alohida emas)', () => {
      const result = service.calculate(
        input({
          items: [
            tile({ pallets: 12 }),
            tile({ productId: 'p2', pallets: 12 }),
          ],
          transport: fura,
        }),
      );
      expect(result.transport?.vehicleCount).toBe(2);
    });
  });

  describe('narx zanjiri kalkulyator ichida', () => {
    it('mahsulot qoidasi lineTotal ga ta’sir qiladi, narx surati — yakuniy narx', () => {
      const result = service.calculate(
        input({ productRules: [rule({ value: -10 })] }),
      );
      expect(result.items[0].pricePerSqm.toString()).toBe('76500');
      expect(result.items[0].lineTotal.toString()).toBe('1101600');
    });

    it('zavod qoidasi faqat o‘sha zavod mahsulotiga', () => {
      const result = service.calculate(
        input({
          items: [tile(), tile({ productId: 'p2', factoryId: 'f2' })],
          productRules: [
            rule({ scope: PricingScope.FACTORY, factoryId: 'f2', value: -50 }),
          ],
        }),
      );
      expect(result.items[0].pricePerSqm.toString()).toBe('85000');
      expect(result.items[1].pricePerSqm.toString()).toBe('42500');
    });

    it('transport qoidasi yo‘l kiraga, mahsulot qoidasi esa yo‘l kiraga TUSHMAYDI', () => {
      const result = service.calculate(
        input({
          transport: fura,
          productRules: [rule({ value: -10 })],
          transportRules: [
            rule({
              domain: PricingDomain.TRANSPORT,
              scope: PricingScope.ROUTE,
              branchRegionTariffId: 't1',
              type: PricingValueType.FIXED,
              value: '9000000',
            }),
          ],
        }),
      );
      expect(result.transport?.unitPrice.toString()).toBe('9000000');
      expect(result.deliveryTotal.toString()).toBe('9000000');

      const noTransportRule = service.calculate(
        input({ transport: fura, productRules: [rule({ value: -10 })] }),
      );
      expect(noTransportRule.transport?.unitPrice.toString()).toBe('12000000');
    });
  });

  describe('yumaloqlash', () => {
    it('qator summasi 2 xonagacha, itemsTotal — yumaloqlangan qatorlar yig‘indisi', () => {
      // 3 × 1.3333 = 3.9999 m² × 12 345.67 = 49 381.445433 → 49 381.45
      const result = service.calculate(
        input({
          items: [
            tile({
              pallets: 3,
              sqmPerPallet: '1.3333',
              basePricePerSqm: '12345.67',
            }),
            tile({
              productId: 'p2',
              pallets: 3,
              sqmPerPallet: '1.3333',
              basePricePerSqm: '12345.67',
            }),
          ],
        }),
      );
      expect(result.items[0].lineTotal.toString()).toBe('49381.45');
      // Yig'indi yumaloqlanmagan summadan (98 762.890866 → .89) emas,
      // yumaloqlangan qatorlardan: 49 381.45 × 2.
      expect(result.itemsTotal.toString()).toBe('98762.9');
    });

    it('float xatosi yo‘q: 0.1 m² × 3 paddon = 0.3', () => {
      const result = service.calculate(
        input({ items: [tile({ pallets: 3, sqmPerPallet: '0.1' })] }),
      );
      expect(result.totalSqm.toString()).toBe('0.3');
    });
  });

  describe('chegara holatlari', () => {
    it.each([
      ['0 paddon', 0],
      ['manfiy', -1],
      ['o‘nlik', 1.5],
      ['NaN', Number.NaN],
      ['xavfsiz butun sondan katta', Number.MAX_SAFE_INTEGER + 1],
    ])('%s — 400', (_label, pallets) => {
      expect(() =>
        service.calculate(input({ items: [tile({ pallets })] })),
      ).toThrow(BadRequestException);
    });

    it('bo‘sh ro‘yxat — 400', () => {
      expect(() => service.calculate(input({ items: [] }))).toThrow(
        'Kamida bitta',
      );
    });

    it('bir mahsulot ikki marta — 400', () => {
      expect(() =>
        service.calculate(input({ items: [tile(), tile()] })),
      ).toThrow('bir marta');
    });

    it('ulkan son — Decimal(14,2) ga sig‘masa 400 (bazada xato emas)', () => {
      expect(() =>
        service.calculate(input({ items: [tile({ pallets: 1_000_000_000 })] })),
      ).toThrow('juda katta');
    });

    it.each([
      [
        'm² Decimal(12,4) dan oshsa',
        { sqmPerPallet: '999999', pallets: 101, basePricePerSqm: '0.01' },
      ],
      [
        'og‘irlik Decimal(12,3) dan oshsa',
        { weightPerPallet: '9999999', pallets: 200, basePricePerSqm: '0.01' },
      ],
    ])('%s — 400 (bazada 500 emas)', (_label, over) => {
      expect(() => service.calculate(input({ items: [tile(over)] }))).toThrow(
        'hajmi',
      );
    });

    it('narx Decimal(14,2) dan oshsa (ulkan ustama) — 400', () => {
      const markup = {
        id: 'r',
        domain: PricingDomain.PRODUCT,
        scope: PricingScope.ALL,
        productId: null,
        factoryId: null,
        branchRegionTariffId: null,
        type: PricingValueType.PERCENT,
        value: '999999999999',
      };
      expect(() =>
        service.calculate(
          input({
            items: [tile({ pallets: 1, sqmPerPallet: '0.0001' })],
            productRules: [markup],
          }),
        ),
      ).toThrow('juda katta');
    });

    it('chegara aynan teng — o‘tadi', () => {
      expect(() =>
        service.calculate(
          input({
            items: [
              tile({
                pallets: 1,
                sqmPerPallet: '99999999.9999',
                weightPerPallet: '999999999.999',
                basePricePerSqm: '0.01',
              }),
            ],
          }),
        ),
      ).not.toThrow();
    });

    it('ulkan son ham aniq hisoblanadi (float yo‘q)', () => {
      const result = service.calculate(
        input({
          items: [tile({ pallets: 100_000, basePricePerSqm: '99999.99' })],
        }),
      );
      // 144 000 m² × 99 999.99 = 14 399 998 560
      expect(result.itemsTotal.toString()).toBe('14399998560');
    });
  });
});
