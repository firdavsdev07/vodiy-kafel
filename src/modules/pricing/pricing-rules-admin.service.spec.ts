import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BranchScopeService } from '../../auth/branch-scope.service';
import {
  PricingDomain,
  PricingScope,
  PricingValueType,
  UserRole,
} from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { SettingsService } from '../settings/settings.service';
import type { CreatePricingRuleDto } from './dto';
import { PricingRulesAdminService } from './pricing-rules-admin.service';

/** B-055 · individual narx qoidalari — admin. */
describe('PricingRulesAdminService (B-055)', () => {
  let service: PricingRulesAdminService;
  let prisma: {
    customer: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock };
    factory: { findUnique: jest.Mock };
    branchRegionTariff: { findUnique: jest.Mock };
    pricingRule: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let settings: { get: jest.Mock };

  const user = (role: UserRole, branchId: string | null, id = 'u1'): Actor => ({
    id,
    type: 'USER',
    role,
    branchId,
  });
  const superAdmin = user(UserRole.SUPER_ADMIN, null, 'u0');
  const fargonaAdmin = user(UserRole.BRANCH_ADMIN, 'fargona');

  const rule = (
    over: Partial<CreatePricingRuleDto> = {},
  ): CreatePricingRuleDto => ({
    domain: PricingDomain.PRODUCT,
    scope: PricingScope.ALL,
    type: PricingValueType.PERCENT,
    value: '-5',
    ...over,
  });

  const row = {
    id: 'r1',
    domain: PricingDomain.PRODUCT,
    scope: PricingScope.PRODUCT,
    type: PricingValueType.FIXED,
    value: new Prisma.Decimal('78000'),
    createdByRole: UserRole.SUPER_ADMIN,
    createdAt: new Date(),
    createdBy: { id: 'u0', fullName: 'Bosh admin' },
    product: { id: 'p1', name: 'Lyuks' },
    factory: null,
    branchRegionTariff: null,
  };

  beforeEach(async () => {
    prisma = {
      customer: {
        findUnique: jest.fn().mockResolvedValue({ branchId: 'fargona' }),
      },
      product: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      factory: { findUnique: jest.fn().mockResolvedValue({ id: 'f1' }) },
      branchRegionTariff: {
        findUnique: jest.fn().mockResolvedValue({ branchId: 'fargona' }),
      },
      pricingRule: {
        findMany: jest.fn().mockResolvedValue([row]),
        findFirst: jest.fn().mockResolvedValue(row),
        create: jest.fn().mockResolvedValue(row),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    settings = { get: jest.fn().mockResolvedValue(10) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PricingRulesAdminService,
        BranchScopeService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settings },
      ],
    }).compile();

    service = moduleRef.get(PricingRulesAdminService);
  });

  describe('🔒 kim', () => {
    it.each([
      ['menejer', user(UserRole.MANAGER, 'fargona')],
      ['moderator', user(UserRole.MODERATOR, 'markaz')],
      ['mijoz', { id: 'c1', type: 'CUSTOMER', branchId: 'fargona' }],
    ])('%s — 403', async (_label, actor) => {
      await expect(service.list(actor, 'c1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.create(actor, 'c1', rule())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('boshqa filial mijozi — 404, yozilmaydi', async () => {
      await expect(
        service.create(user(UserRole.BRANCH_ADMIN, 'andijon'), 'c1', rule()),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.pricingRule.create).not.toHaveBeenCalled();
    });
  });

  describe('create — SUPER_ADMIN', () => {
    it('aniq mahsulotga FIXED narx — nishon ustunlari to‘g‘ri, rol yoziladi', async () => {
      const result = await service.create(
        superAdmin,
        'c1',
        rule({
          scope: PricingScope.PRODUCT,
          scopeId: 'p1',
          type: PricingValueType.FIXED,
          value: '78000',
        }),
      );
      const [{ data }] = prisma.pricingRule.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(data).toMatchObject({
        customerId: 'c1',
        domain: PricingDomain.PRODUCT,
        scope: PricingScope.PRODUCT,
        productId: 'p1',
        factoryId: null,
        branchRegionTariffId: null,
        type: PricingValueType.FIXED,
        createdByUserId: 'u0',
        createdByRole: UserRole.SUPER_ADMIN,
      });
      expect(result).toMatchObject({
        target: { id: 'p1', name: 'Lyuks' },
        value: '78000',
      });
      expect(settings.get).not.toHaveBeenCalled();
    });

    it.each([
      [
        'TRANSPORT + PRODUCT scope',
        {
          domain: PricingDomain.TRANSPORT,
          scope: PricingScope.PRODUCT,
          scopeId: 'p1',
        },
      ],
      ['PRODUCT + ROUTE scope', { scope: PricingScope.ROUTE, scopeId: 't1' }],
      ['ALL + scopeId', { scopeId: 'p1' }],
      ['PRODUCT scopeId siz', { scope: PricingScope.PRODUCT }],
      ['FIXED manfiy', { type: PricingValueType.FIXED, value: '-100' }],
      ['PERCENT −100', { value: '-100' }],
    ])('%s — 400', async (_label, over) => {
      await expect(
        service.create(
          superAdmin,
          'c1',
          rule(over as Partial<CreatePricingRuleDto>),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.pricingRule.create).not.toHaveBeenCalled();
    });

    it('mavjud bo‘lmagan mahsulot — 400', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create(
          superAdmin,
          'c1',
          rule({ scope: PricingScope.PRODUCT, scopeId: 'nope' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('🔒 boshqa filial tarifi (ROUTE) — 400', async () => {
      prisma.branchRegionTariff.findUnique.mockResolvedValueOnce({
        branchId: 'andijon',
      });
      await expect(
        service.create(
          superAdmin,
          'c1',
          rule({
            domain: PricingDomain.TRANSPORT,
            scope: PricingScope.ROUTE,
            scopeId: 't-andijon',
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('shu darajada qoida bor — 409', async () => {
      prisma.pricingRule.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.create(superAdmin, 'c1', rule()),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('🔒 filial admini chegarasi', () => {
    it('chegara ichida chegirma — o‘tadi, rol BRANCH_ADMIN', async () => {
      await service.create(fargonaAdmin, 'c1', rule({ value: '-10' }));
      expect(settings.get).toHaveBeenCalledWith(
        'pricing.branchAdminMaxDiscountPercent',
      );
      const [{ data }] = prisma.pricingRule.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(data.createdByRole).toBe(UserRole.BRANCH_ADMIN);
    });

    it.each([
      ['chegaradan oshdi', { value: '-10.01' }],
      ['FIXED', { type: PricingValueType.FIXED, value: '1000' }],
      ['ustama (musbat)', { value: '5' }],
      [
        'transport ham chegarada',
        { domain: PricingDomain.TRANSPORT, value: '-15' },
      ],
    ])('%s — 400', async (_label, over) => {
      await expect(
        service.create(fargonaAdmin, 'c1', rule(over)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.pricingRule.create).not.toHaveBeenCalled();
    });

    it('sozlama 0 — hech qanday chegirma yo‘q', async () => {
      settings.get.mockResolvedValueOnce(0);
      await expect(
        service.create(fargonaAdmin, 'c1', rule({ value: '-1' })),
      ).rejects.toThrow('ruxsati sozlanmagan');
    });

    it('🔒 ro‘yxat — faqat O‘ZI yaratganlari', async () => {
      await service.list(fargonaAdmin, 'c1');
      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { customerId: 'c1', createdByUserId: 'u1' },
        }),
      );
    });

    it('SUPER_ADMIN ro‘yxati — hammasi', async () => {
      await service.list(superAdmin, 'c1');
      expect(prisma.pricingRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: 'c1' } }),
      );
    });

    it('🔒 begona (bosh admin) qoidasini o‘chirish — 404, o‘chmaydi', async () => {
      prisma.pricingRule.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.remove(fargonaAdmin, 'c1', 'r1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.pricingRule.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1', customerId: 'c1', createdByUserId: 'u1' },
        }),
      );
      expect(prisma.pricingRule.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('prepare — mijoz bilan birga (B-036)', () => {
    it('bir darajada ikki qoida — 400', async () => {
      await expect(
        service.prepare(superAdmin, 'fargona', [rule(), rule({ value: '-7' })]),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('turli darajalar — hammasi tayyorlanadi, bazaga yozilmaydi', async () => {
      const prepared = await service.prepare(superAdmin, 'fargona', [
        rule(),
        rule({ scope: PricingScope.FACTORY, scopeId: 'f1' }),
        rule({ domain: PricingDomain.TRANSPORT }),
      ]);
      expect(prepared).toHaveLength(3);
      expect(prepared[1]).toMatchObject({ factoryId: 'f1', productId: null });
      expect(prisma.pricingRule.create).not.toHaveBeenCalled();
    });
  });
});
