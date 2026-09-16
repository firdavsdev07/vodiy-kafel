import {
  PricingDomain,
  PricingScope,
  PricingValueType,
} from '../../common/enums';
import {
  PricingResolverService,
  type PricingRuleInput,
  type PricingTarget,
} from './pricing-resolver.service';

/** B-054 · narx zanjiri — sof funksiya, har bir tarmoq qoplanadi. */
describe('PricingResolverService (B-054)', () => {
  const service = new PricingResolverService();

  let seq = 0;
  const rule = (
    over: Partial<PricingRuleInput> & Pick<PricingRuleInput, 'scope'>,
  ): PricingRuleInput => ({
    id: `r${++seq}`,
    domain: PricingDomain.PRODUCT,
    productId: null,
    factoryId: null,
    branchRegionTariffId: null,
    type: PricingValueType.PERCENT,
    value: -10,
    ...over,
  });

  const product: PricingTarget = {
    domain: 'PRODUCT',
    productId: 'p1',
    factoryId: 'f1',
  };
  const route: PricingTarget = {
    domain: 'TRANSPORT',
    branchRegionTariffId: 't1',
  };

  const price = (
    rules: PricingRuleInput[],
    target: PricingTarget,
    base: string | number = '100000',
  ) => service.resolve(rules, target, base);

  describe('qoida yo‘q', () => {
    it('bazaviy narx o‘zgarishsiz, ruleId null', () => {
      const result = price([], product, '85000.50');
      expect(result.finalPrice.toString()).toBe('85000.5');
      expect(result.ruleId).toBeNull();
    });
  });

  describe('ustunlik — PRODUCT domeni', () => {
    const productRule = rule({
      scope: PricingScope.PRODUCT,
      productId: 'p1',
      type: PricingValueType.FIXED,
      value: '80000',
    });
    const factoryRule = rule({
      scope: PricingScope.FACTORY,
      factoryId: 'f1',
      value: -20,
    });
    const allRule = rule({ scope: PricingScope.ALL, value: -5 });

    it('aynan mahsulot qoidasi zavod va ALL dan ustun (tartibdan qat’i nazar)', () => {
      const result = price([allRule, factoryRule, productRule], product);
      expect(result.finalPrice.toString()).toBe('80000');
      expect(result.ruleId).toBe(productRule.id);
    });

    it('mahsulot qoidasi yo‘q — zavod qoidasi ALL dan ustun', () => {
      const result = price([allRule, factoryRule], product);
      expect(result.finalPrice.toString()).toBe('80000');
      expect(result.ruleId).toBe(factoryRule.id);
    });

    it('faqat ALL — u qo‘llanadi', () => {
      expect(price([allRule], product).finalPrice.toString()).toBe('95000');
    });

    it('BOSHQA mahsulot/zavod qoidasi qo‘llanmaydi — ALL ga tushadi', () => {
      const result = price(
        [
          rule({ scope: PricingScope.PRODUCT, productId: 'p2', value: -50 }),
          rule({ scope: PricingScope.FACTORY, factoryId: 'f2', value: -50 }),
          allRule,
        ],
        product,
      );
      expect(result.ruleId).toBe(allRule.id);
    });
  });

  describe('ustunlik — TRANSPORT domeni', () => {
    it('aynan yo‘nalish qoidasi ALL dan ustun', () => {
      const routeRule = rule({
        domain: PricingDomain.TRANSPORT,
        scope: PricingScope.ROUTE,
        branchRegionTariffId: 't1',
        type: PricingValueType.FIXED,
        value: '10000000',
      });
      const allRule = rule({
        domain: PricingDomain.TRANSPORT,
        scope: PricingScope.ALL,
        value: -10,
      });
      const result = price([allRule, routeRule], route, '12000000');
      expect(result.finalPrice.toString()).toBe('10000000');
      expect(result.ruleId).toBe(routeRule.id);
    });

    it('boshqa yo‘nalish qoidasi qo‘llanmaydi', () => {
      const result = price(
        [
          rule({
            domain: PricingDomain.TRANSPORT,
            scope: PricingScope.ROUTE,
            branchRegionTariffId: 't2',
          }),
        ],
        route,
        '12000000',
      );
      expect(result.ruleId).toBeNull();
      expect(result.finalPrice.toString()).toBe('12000000');
    });
  });

  describe('🔒 domenlar aralashmaydi', () => {
    it('mahsulotdagi ALL −10% yo‘l kiraga tushmaydi', () => {
      const result = price(
        [rule({ scope: PricingScope.ALL, value: -10 })],
        route,
        '12000000',
      );
      expect(result.ruleId).toBeNull();
    });

    it('transportdagi ALL −10% mahsulotga tushmaydi', () => {
      const result = price(
        [
          rule({
            domain: PricingDomain.TRANSPORT,
            scope: PricingScope.ALL,
            value: -10,
          }),
        ],
        product,
      );
      expect(result.ruleId).toBeNull();
    });
  });

  describe('qiymat turlari', () => {
    it('FIXED — bazaviy narxdan qat’i nazar aniq summa (ustama ham bo‘lishi mumkin)', () => {
      const fixed = rule({
        scope: PricingScope.ALL,
        type: PricingValueType.FIXED,
        value: '120000',
      });
      expect(price([fixed], product, '100000').finalPrice.toString()).toBe(
        '120000',
      );
    });

    it('PERCENT ustama (+5%)', () => {
      const markup = rule({ scope: PricingScope.ALL, value: 5 });
      expect(price([markup], product, '100000').finalPrice.toString()).toBe(
        '105000',
      );
    });

    it('PERCENT — bazaviy narx o‘zgarsa avtomatik moslashadi', () => {
      const discount = rule({ scope: PricingScope.ALL, value: -20 });
      expect(price([discount], product, '50000').finalPrice.toString()).toBe(
        '40000',
      );
      expect(price([discount], product, '60000').finalPrice.toString()).toBe(
        '48000',
      );
    });

    it('o‘nlik foiz va yumaloqlash: 2 xonagacha, yarim yuqoriga', () => {
      const discount = rule({ scope: PricingScope.ALL, value: '-12.5' });
      // 85 000.55 × 0.875 = 74 375.48125 → 74 375.48
      expect(price([discount], product, '85000.55').finalPrice.toString()).toBe(
        '74375.48',
      );
      // 0.05 × 0.9 = 0.045 → 0.05 (yarim yuqoriga)
      const ten = rule({ scope: PricingScope.ALL, value: -10 });
      expect(price([ten], product, '0.05').finalPrice.toString()).toBe('0.05');
    });

    it('🔒 juda kichik narxga katta chegirma — 0.00 emas, eng kami 0.01', () => {
      const discount = rule({ scope: PricingScope.ALL, value: -60 });
      expect(price([discount], product, '0.01').finalPrice.toString()).toBe(
        '0.01',
      );
    });

    it('float xatosi yo‘q: 0.1 + 0.2 kabi holatlar Decimal da aniq', () => {
      const discount = rule({ scope: PricingScope.ALL, value: -30 });
      expect(price([discount], product, '0.3').finalPrice.toString()).toBe(
        '0.21',
      );
    });
  });
});
