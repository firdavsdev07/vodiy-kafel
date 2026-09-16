import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthService } from '../../auth/auth.service';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { AccountsService } from '../accounts/accounts.service';
import { PricingRulesAdminService } from '../pricing/pricing-rules-admin.service';
import { CustomersAdminService } from './customers-admin.service';
import { AdminCustomerQueryDto, CreateCustomerDto } from './dto';

/** B-036 · optom mijozlar — admin. */
describe('CustomersAdminService (B-036)', () => {
  let service: CustomersAdminService;
  let pricingRules: { prepare: jest.Mock };
  let prisma: {
    customer: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    customerAccount: { fields: { totalPaid: string } };
    branch: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
  };

  const staff = (
    role: UserRole,
    branchId: string | null,
    id = 'u1',
  ): Actor => ({
    id,
    type: 'USER',
    role,
    branchId,
  });
  const fargonaAdmin = staff(UserRole.BRANCH_ADMIN, 'fargona');
  const superAdmin = staff(UserRole.SUPER_ADMIN, null, 'u0');

  const detailRow = {
    id: 'c1',
    login: 'yangi-mijoz',
    companyName: 'Qurilish',
    inn: null,
    contactName: 'Vali',
    phone: '+998901234567',
    isActive: true,
    mustChangePassword: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    branch: { id: 'fargona', name: 'Farg‘ona' },
    manager: null,
    createdBy: { id: 'u1', fullName: 'Admin' },
    orders: [],
  };

  const dto = (over: Partial<CreateCustomerDto> = {}): CreateCustomerDto => ({
    login: 'yangi-mijoz',
    companyName: ' Qurilish ',
    contactName: 'Vali',
    phone: '+998901234567',
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      customer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest
          .fn()
          .mockImplementation((args: { select: Record<string, unknown> }) =>
            // requireInScope — qisqa select; findOne — to'liq.
            'orders' in args.select
              ? detailRow
              : { branchId: 'fargona', managerId: 'm-old' },
          ),
        create: jest.fn().mockResolvedValue({ id: 'c1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      customerAccount: { fields: { totalPaid: 'FIELD_REF' } },
      branch: { findUnique: jest.fn().mockResolvedValue({ isActive: true }) },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          branchId: 'fargona',
          role: UserRole.MANAGER,
          isActive: true,
        }),
      },
    };

    pricingRules = {
      prepare: jest.fn().mockResolvedValue([{ scope: 'ALL', value: '-5' }]),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersAdminService,
        { provide: PricingRulesAdminService, useValue: pricingRules },
        BranchScopeService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: AuthService,
          useValue: { hashPassword: (p: string) => `hash(${p})` },
        },
        {
          provide: AccountsService,
          useValue: {
            getForCustomer: jest.fn().mockResolvedValue({
              totalPurchased: '0',
              totalPaid: '0',
              balance: '0',
            }),
            findForCustomer: jest.fn().mockResolvedValue({ items: [] }),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CustomersAdminService);
  });

  describe('findAll', () => {
    const query = (over: Partial<AdminCustomerQueryDto> = {}) =>
      Object.assign(new AdminCustomerQueryDto(), over);

    it('🔒 filial admini — filtr o‘z filialiga majburlanadi', async () => {
      await service.findAll(fargonaAdmin, query());
      const [{ where }] = prisma.customer.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(where.branchId).toBe('fargona');
    });

    it('🔒 filial admini boshqa filialni so‘rasa — 404', async () => {
      await expect(
        service.findAll(fargonaAdmin, query({ branchId: 'andijon' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('SUPER_ADMIN — filtrsiz', async () => {
      await service.findAll(superAdmin, query());
      const [{ where }] = prisma.customer.findMany.mock.calls[0] as [
        { where: Record<string, unknown> },
      ];
      expect(where.branchId).toBeUndefined();
    });

    it('hasDebt=true — xarid > to‘langan (ustun havolasi)', async () => {
      await service.findAll(superAdmin, query({ hasDebt: true }));
      const [{ where }] = prisma.customer.findMany.mock.calls[0] as [
        { where: { AND: unknown[] } },
      ];
      expect(where.AND).toContainEqual({
        account: { is: { totalPurchased: { gt: 'FIELD_REF' } } },
      });
    });

    it('balans qatorda hisoblanadi; hisob yo‘q — 0', async () => {
      prisma.customer.findMany.mockResolvedValueOnce([
        {
          id: 'c1',
          account: {
            totalPurchased: new Prisma.Decimal('500'),
            totalPaid: new Prisma.Decimal('200'),
          },
        },
        { id: 'c2', account: null },
      ]);
      prisma.customer.count.mockResolvedValueOnce(2);
      const page = await service.findAll(superAdmin, query());
      expect(page.items.map((i) => i.balance)).toEqual(['300', '0']);
      expect(page.items[0]).not.toHaveProperty('account');
    });
  });

  describe('create', () => {
    it('filial admini — O‘Z filialiga, vaqtinchalik parol hash bilan', async () => {
      const result = await service.create(fargonaAdmin, dto());

      const [{ data }] = prisma.customer.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(data).toMatchObject({
        login: 'yangi-mijoz',
        branchId: 'fargona',
        managerId: null,
        mustChangePassword: true,
        companyName: 'Qurilish',
        createdByUserId: 'u1',
      });
      expect(result.temporaryPassword).toHaveLength(12);
      expect(data.passwordHash).toBe(`hash(${result.temporaryPassword})`);
      expect(JSON.stringify(result.customer)).not.toContain('hash(');
    });

    it('🔒 filial admini boshqa filialga — 404, yozilmaydi', async () => {
      await expect(
        service.create(fargonaAdmin, dto({ branchId: 'andijon' })),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.customer.create).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN filial bermasa — 400', async () => {
      await expect(service.create(superAdmin, dto())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('faol bo‘lmagan filial — 400', async () => {
      prisma.branch.findUnique.mockResolvedValueOnce({ isActive: false });
      await expect(
        service.create(superAdmin, dto({ branchId: 'yopiq' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('menejer yaratsa — o‘ziga biriktiriladi', async () => {
      await service.create(staff(UserRole.MANAGER, 'fargona', 'm1'), dto());
      const [{ data }] = prisma.customer.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(data.managerId).toBe('m1');
    });

    it('🔒 boshqa filial menejerini biriktirib bo‘lmaydi — 400', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        branchId: 'andijon',
        role: UserRole.MANAGER,
        isActive: true,
      });
      await expect(
        service.create(fargonaAdmin, dto({ managerId: 'andijon-m' })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.customer.create).not.toHaveBeenCalled();
    });

    it('qoidalarsiz — prepare chaqirilmaydi, pricingRules yozilmaydi', async () => {
      await service.create(fargonaAdmin, dto());
      expect(pricingRules.prepare).not.toHaveBeenCalled();
      const [{ data }] = prisma.customer.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(data).not.toHaveProperty('pricingRules');
    });

    it('🆕 qoidalar bilan — mijoz filiali bo‘yicha tekshiriladi va BIRGA yoziladi', async () => {
      const rules = [
        { domain: 'PRODUCT', scope: 'ALL', type: 'PERCENT', value: '-5' },
      ] as CreateCustomerDto['pricingRules'];
      await service.create(fargonaAdmin, dto({ pricingRules: rules }));

      expect(pricingRules.prepare).toHaveBeenCalledWith(
        fargonaAdmin,
        'fargona',
        rules,
      );
      const [{ data }] = prisma.customer.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(data.pricingRules).toEqual({
        create: [{ scope: 'ALL', value: '-5' }],
      });
    });

    it('🔒 qoida rad etilsa — mijoz ham yaratilmaydi', async () => {
      pricingRules.prepare.mockRejectedValueOnce(
        new BadRequestException('chegara'),
      );
      await expect(
        service.create(
          fargonaAdmin,
          dto({
            pricingRules: [
              {
                domain: 'PRODUCT',
                scope: 'ALL',
                type: 'PERCENT',
                value: '-90',
              },
            ] as CreateCustomerDto['pricingRules'],
          }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.customer.create).not.toHaveBeenCalled();
    });

    it('login band — 409', async () => {
      prisma.customer.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(service.create(fargonaAdmin, dto())).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update / setActive', () => {
    it('🔒 filial admini mijozni boshqa filialga ko‘chira olmaydi — 404', async () => {
      await expect(
        service.update(fargonaAdmin, 'c1', { branchId: 'andijon' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.customer.update).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN ko‘chiradi — eski menejer uziladi', async () => {
      await service.update(superAdmin, 'c1', { branchId: 'andijon' });
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { branchId: 'andijon', managerId: null },
      });
    });

    it('faqat berilgan maydonlar; inn null — tozalash', async () => {
      await service.update(fargonaAdmin, 'c1', { inn: null, phone: ' +998 ' });
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { inn: null, phone: '+998' },
      });
    });

    it('🔒 boshqa filial mijozini o‘chirib bo‘lmaydi — 404', async () => {
      await expect(
        service.setActive(staff(UserRole.BRANCH_ADMIN, 'andijon'), 'c1', false),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.customer.update).not.toHaveBeenCalled();
    });
  });

  describe('CreateCustomerDto validatsiyasi', () => {
    const errors = async (plain: Record<string, unknown>) =>
      (await validate(plainToInstance(CreateCustomerDto, plain))).map(
        (e) => e.property,
      );
    const base = {
      login: 'Fargona-Qurilish ',
      companyName: 'X',
      contactName: 'Y',
      phone: '+998901234567',
    };

    it('login kichik harfga keltiriladi va o‘tadi', async () => {
      expect(await errors(base)).toEqual([]);
      expect(plainToInstance(CreateCustomerDto, base).login).toBe(
        'fargona-qurilish',
      );
    });

    it.each([
      ['login qisqa', { login: 'ab' }, 'login'],
      ['login bo‘sh joy bilan', { login: 'ali vali' }, 'login'],
      ['INN 8 raqam', { inn: '12345678' }, 'inn'],
      ['telefon xato', { phone: 'abc' }, 'phone'],
    ])('%s — rad', async (_label, over, property) => {
      expect(await errors({ ...base, ...over })).toContain(property);
    });

    it('inn: null — ruxsat', async () => {
      expect(await errors({ ...base, inn: null })).toEqual([]);
    });
  });
});
