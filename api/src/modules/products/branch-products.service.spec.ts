import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { BranchProductsService } from './branch-products.service';
import { BranchProductQueryDto } from './dto';

/**
 * B-021 · filial narxlari. Diqqat markazida — filial izolyatsiyasi (B-051):
 * Andijon admini Farg'ona narxini ko'rmasligi va o'zgartira olmasligi.
 */
describe('BranchProductsService (B-021)', () => {
  let service: BranchProductsService;
  let prisma: {
    branchProduct: Record<string, jest.Mock>;
    branch: { findUnique: jest.Mock };
    product: { findUnique: jest.Mock };
  };

  const superAdmin: Actor = {
    id: 'u0',
    type: 'USER',
    role: UserRole.SUPER_ADMIN,
    branchId: null,
  };
  const andijonAdmin: Actor = {
    id: 'u1',
    type: 'USER',
    role: UserRole.BRANCH_ADMIN,
    branchId: 'andijon',
  };

  const row = (over: Record<string, unknown> = {}) => ({
    id: 'bp1',
    pricePerSqm: new Prisma.Decimal('85000.50'),
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    branch: { id: 'andijon', name: 'Andijon', city: 'Andijon' },
    product: { id: 'p1', name: 'Lyuks', slug: 'lyuks', isActive: true },
    ...over,
  });

  const query = (over: Partial<BranchProductQueryDto> = {}) =>
    Object.assign(new BranchProductQueryDto(), over);

  beforeEach(async () => {
    prisma = {
      branchProduct: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([row()]),
        findUnique: jest.fn(),
        upsert: jest.fn().mockResolvedValue(row()),
        update: jest.fn().mockResolvedValue(row()),
      },
      branch: { findUnique: jest.fn().mockResolvedValue({ id: 'andijon' }) },
      product: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        BranchProductsService,
        BranchScopeService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(BranchProductsService);
  });

  const whereOf = (mock: jest.Mock) =>
    (mock.mock.calls as [{ where: Record<string, unknown> }][])[0][0].where;

  describe('findAll', () => {
    it('🔒 filial admini filtr bermasa ham — faqat o‘z filiali', async () => {
      await service.findAll(andijonAdmin, query());
      expect(whereOf(prisma.branchProduct.findMany)).toEqual({
        branchId: 'andijon',
      });
      expect(whereOf(prisma.branchProduct.count)).toEqual({
        branchId: 'andijon',
      });
    });

    it('🔒 filial admini boshqa filialni so‘rasa — 404', async () => {
      await expect(
        service.findAll(andijonAdmin, query({ branchId: 'fargona' })),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.branchProduct.findMany).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN filtrsiz — hamma filial', async () => {
      await service.findAll(superAdmin, query());
      expect(whereOf(prisma.branchProduct.findMany)).toEqual({});
    });

    it('SUPER_ADMIN filial va boshqa filtrlar bilan', async () => {
      await service.findAll(
        superAdmin,
        query({ branchId: 'fargona', productId: 'p1', isActive: false }),
      );
      expect(whereOf(prisma.branchProduct.findMany)).toEqual({
        branchId: 'fargona',
        productId: 'p1',
        isActive: false,
      });
    });

    it('narx Decimal → satr (float emas)', async () => {
      const result = await service.findAll(superAdmin, query());
      expect(result.items[0].pricePerSqm).toBe('85000.5');
    });
  });

  describe('upsert', () => {
    it('🔒 filial admini branchId yubormasa — o‘z filialiga yoziladi', async () => {
      await service.upsert(andijonAdmin, {
        productId: 'p1',
        pricePerSqm: '90000',
      });
      const arg = (
        prisma.branchProduct.upsert.mock.calls as [
          { where: unknown; create: Record<string, unknown> },
        ][]
      )[0][0];
      expect(arg.where).toEqual({
        branchId_productId: { branchId: 'andijon', productId: 'p1' },
      });
      expect(arg.create.branchId).toBe('andijon');
    });

    it('🔒 filial admini BOSHQA filialga narx yozmoqchi — 404, yozilmaydi', async () => {
      await expect(
        service.upsert(andijonAdmin, {
          branchId: 'fargona',
          productId: 'p1',
          pricePerSqm: '1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.branchProduct.upsert).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN branchId bermasa — 400', async () => {
      await expect(
        service.upsert(superAdmin, { productId: 'p1', pricePerSqm: '1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('filial yoki mahsulot yo‘q — 404', async () => {
      prisma.branch.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.upsert(superAdmin, {
          branchId: 'x',
          productId: 'p1',
          pricePerSqm: '1',
        }),
      ).rejects.toThrow('Filial topilmadi');

      prisma.product.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.upsert(superAdmin, {
          branchId: 'andijon',
          productId: 'x',
          pricePerSqm: '1',
        }),
      ).rejects.toThrow('Mahsulot topilmadi');
    });

    it('isActive berilmasa — yangi yozuvda true, mavjudida tegilmaydi', async () => {
      await service.upsert(superAdmin, {
        branchId: 'andijon',
        productId: 'p1',
        pricePerSqm: '90000',
      });
      const arg = (
        prisma.branchProduct.upsert.mock.calls as [
          { create: Record<string, unknown>; update: Record<string, unknown> },
        ][]
      )[0][0];
      expect(arg.create.isActive).toBe(true);
      expect(arg.update).toEqual({ pricePerSqm: '90000' });
    });
  });

  describe('updatePrice', () => {
    it('🔒 begona filial narxi — 404, mavjud bo‘lmagani bilan BIR XIL matn', async () => {
      prisma.branchProduct.findUnique.mockResolvedValueOnce({
        branchId: 'fargona',
      });
      const foreign = service
        .updatePrice(andijonAdmin, 'bp1', { pricePerSqm: '1' })
        .catch((error: Error) => error.message);

      prisma.branchProduct.findUnique.mockResolvedValueOnce(null);
      const missing = service
        .updatePrice(andijonAdmin, 'bp2', { pricePerSqm: '1' })
        .catch((error: Error) => error.message);

      expect(await foreign).toBe(await missing);
      expect(prisma.branchProduct.update).not.toHaveBeenCalled();
    });

    it('o‘z filiali narxi — faqat narx yangilanadi', async () => {
      prisma.branchProduct.findUnique.mockResolvedValueOnce({
        branchId: 'andijon',
      });
      await service.updatePrice(andijonAdmin, 'bp1', { pricePerSqm: '92000' });
      const arg = (
        prisma.branchProduct.update.mock.calls as [{ data: unknown }][]
      )[0][0];
      expect(arg.data).toEqual({ pricePerSqm: '92000' });
    });
  });
});
