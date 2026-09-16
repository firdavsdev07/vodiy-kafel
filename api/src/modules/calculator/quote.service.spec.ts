import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { CustomerOnlyGuard } from '../../auth/guards/customer-only.guard';
import {
  BranchType,
  PricingDomain,
  PricingScope,
  PricingValueType,
  UserRole,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { DeliveryService } from '../delivery/delivery.service';
import { PricingResolverService } from '../pricing/pricing-resolver.service';
import { PricingRulesService } from '../pricing/pricing-rules.service';
import { CalculatorService } from './calculator.service';
import { QuoteService } from './quote.service';

/** B-027 · kalkulyator endpointlari ortidagi servis. */
describe('QuoteService (B-027)', () => {
  let service: QuoteService;
  let prisma: {
    customer: { findUnique: jest.Mock };
    branch: { findUnique: jest.Mock };
    branchProduct: { findMany: jest.Mock };
  };
  let delivery: { requireActiveTariff: jest.Mock };
  let pricingRules: { findForCustomer: jest.Mock };

  const customer: Actor = { id: 'c1', type: 'CUSTOMER', branchId: 'fargona' };

  const branchProduct = (id: string, price = '85000') => ({
    pricePerSqm: new Prisma.Decimal(price),
    product: {
      id,
      name: `Mahsulot ${id}`,
      factoryId: 'f1',
      sqmPerPallet: new Prisma.Decimal('1.44'),
      weightPerPallet: new Prisma.Decimal('32.5'),
    },
  });

  const tariff = {
    id: 't1',
    price: new Prisma.Decimal('12000000'),
    transportType: { id: 'fura', name: 'Fura', capacityPallets: 20 },
    region: { id: 'toshkent', name: 'Toshkent shahri' },
  };

  beforeEach(async () => {
    prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue({
          isActive: true,
          branchId: 'fargona',
          managerId: null,
          branch: { type: BranchType.RETAIL },
        }),
      },
      branch: { findUnique: jest.fn().mockResolvedValue({ isActive: true }) },
      branchProduct: {
        findMany: jest.fn().mockResolvedValue([branchProduct('p1')]),
      },
    };
    delivery = { requireActiveTariff: jest.fn().mockResolvedValue(tariff) };
    pricingRules = {
      findForCustomer: jest
        .fn()
        .mockResolvedValue({ product: [], transport: [] }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteService,
        BranchScopeService,
        CalculatorService,
        PricingResolverService,
        { provide: PrismaService, useValue: prisma },
        { provide: DeliveryService, useValue: delivery },
        { provide: PricingRulesService, useValue: pricingRules },
      ],
    }).compile();

    service = moduleRef.get(QuoteService);
  });

  const items = [{ productId: 'p1', pallets: 10 }];

  describe('🔒 kim hisoblay oladi', () => {
    it.each([
      ['mehmon', undefined],
      [
        'xodim (SUPER_ADMIN)',
        { id: 'u1', type: 'USER', role: UserRole.SUPER_ADMIN, branchId: null },
      ],
      [
        'filial admini',
        {
          id: 'u2',
          type: 'USER',
          role: UserRole.BRANCH_ADMIN,
          branchId: 'fargona',
        },
      ],
    ] as [string, Actor | undefined][])('%s — 403', async (_label, actor) => {
      await expect(service.quote(actor, items, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.branchProduct.findMany).not.toHaveBeenCalled();
    });

    it('o‘chirilgan mijoz (token hali amalda) — 401', async () => {
      prisma.customer.findUnique.mockResolvedValueOnce({ isActive: false });
      await expect(service.quote(customer, items, {})).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('🔒 filial tokendan', () => {
    it('narx mijoz filialidan, faqat faol va vitrinada ko‘rinadigan mahsulot', async () => {
      await service.quote(customer, items, {});

      const arg = (
        prisma.branchProduct.findMany.mock.calls as [
          { where: Record<string, unknown> },
        ][]
      )[0][0];
      expect(arg.where).toEqual({
        branchId: 'fargona',
        productId: { in: ['p1'] },
        isActive: true,
        product: { isActive: true, factory: { isActive: true } },
      });
    });

    it('mahsulot filialda sotilmaydi — 404, qaysi mahsulot ekani aytiladi', async () => {
      prisma.branchProduct.findMany.mockResolvedValueOnce([
        branchProduct('p1'),
      ]);
      await expect(
        service.quote(
          customer,
          [...items, { productId: 'andijon-only', pallets: 1 }],
          {},
        ),
      ).rejects.toThrow(
        new NotFoundException(
          'Mahsulot topilmadi yoki filialingizda sotilmaydi: andijon-only',
        ),
      );
    });

    it('tarif mijoz filiali bo‘yicha qidiriladi', async () => {
      await service.quote(customer, items, {
        regionId: 'toshkent',
        transportTypeId: 'fura',
      });
      expect(delivery.requireActiveTariff).toHaveBeenCalledWith(
        'fargona',
        'toshkent',
        'fura',
      );
    });
  });

  describe('hisob', () => {
    it('transportsiz — summalar satr ko‘rinishida, transport null', async () => {
      const result = await service.quote(customer, items, {});
      expect(result).toMatchObject({
        items: [
          {
            productId: 'p1',
            name: 'Mahsulot p1',
            sqm: '14.4',
            pricePerSqm: '85000',
            lineTotal: '1224000',
          },
        ],
        transport: null,
        deliveryTotal: '0',
        grandTotal: '1224000',
      });
      expect(delivery.requireActiveTariff).not.toHaveBeenCalled();
    });

    it('transport bilan', async () => {
      const result = await service.quote(
        customer,
        [{ productId: 'p1', pallets: 21 }],
        { regionId: 'toshkent', transportTypeId: 'fura' },
      );
      expect(result.transport).toEqual({
        transportTypeId: 'fura',
        transportTypeName: 'Fura',
        regionName: 'Toshkent shahri',
        capacityPallets: 20,
        vehicleCount: 2,
        unitPrice: '12000000',
        total: '24000000',
      });
    });

    it('mijoz qoidalari SHU mijoz ID si bo‘yicha yuklanadi va qo‘llanadi', async () => {
      pricingRules.findForCustomer.mockResolvedValueOnce({
        product: [
          {
            id: 'r1',
            domain: PricingDomain.PRODUCT,
            scope: PricingScope.ALL,
            productId: null,
            factoryId: null,
            branchRegionTariffId: null,
            type: PricingValueType.PERCENT,
            value: -10,
          },
        ],
        transport: [],
      });

      const result = await service.quote(customer, items, {});

      expect(pricingRules.findForCustomer).toHaveBeenCalledWith('c1');
      expect(result.items[0].pricePerSqm).toBe('76500');
      expect(result).not.toHaveProperty('ruleId');
      expect(JSON.stringify(result)).not.toContain('r1');
    });

    it('faqat viloyat yoki faqat transport — 400', async () => {
      await expect(
        service.quote(customer, items, { regionId: 'toshkent' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.quote(customer, items, { transportTypeId: 'fura' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deliveryOnly', () => {
    it('tarif + transport qoidasi, mijoz filiali bo‘yicha', async () => {
      pricingRules.findForCustomer.mockResolvedValueOnce({
        product: [],
        transport: [
          {
            id: 'r2',
            domain: PricingDomain.TRANSPORT,
            scope: PricingScope.ROUTE,
            productId: null,
            factoryId: null,
            branchRegionTariffId: 't1',
            type: PricingValueType.FIXED,
            value: '10000000',
          },
        ],
      });

      const result = await service.deliveryOnly(customer, {
        totalPallets: 41,
        regionId: 'toshkent',
        transportTypeId: 'fura',
      });

      expect(delivery.requireActiveTariff).toHaveBeenCalledWith(
        'fargona',
        'toshkent',
        'fura',
      );
      expect(result).toMatchObject({
        vehicleCount: 3,
        unitPrice: '10000000',
        total: '30000000',
      });
    });
  });
});

describe('CustomerOnlyGuard (B-027)', () => {
  const guard = new CustomerOnlyGuard();
  const context = (user: unknown) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it('optom mijoz tokeni — o‘tadi', () => {
    expect(guard.canActivate(context({ sub: 'c1', type: 'CUSTOMER' }))).toBe(
      true,
    );
  });

  it.each([
    ['xodim', { sub: 'u1', type: 'USER', role: 'SUPER_ADMIN' }],
    ['token yo‘q', undefined],
  ])('%s — 403', (_label, user) => {
    expect(() => guard.canActivate(context(user))).toThrow(ForbiddenException);
  });
});
