import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, type PrismaService } from '../../prisma';
import { DeliveryAdminService } from './delivery-admin.service';
import { TariffQueryDto } from './dto';

/** B-056 · transport turlari, viloyatlar, tariflar — admin. */
describe('DeliveryAdminService (B-056)', () => {
  let service: DeliveryAdminService;
  let prisma: {
    transportType: Record<string, jest.Mock>;
    region: Record<string, jest.Mock>;
    branch: { findUnique: jest.Mock };
    branchRegionTariff: Record<string, jest.Mock>;
  };

  const staff = (role: UserRole, branchId: string | null): Actor => ({
    id: 'u1',
    type: 'USER',
    role,
    branchId,
  });
  const superAdmin = staff(UserRole.SUPER_ADMIN, null);
  const fargonaAdmin = staff(UserRole.BRANCH_ADMIN, 'fargona');
  const tariffRow = {
    id: 't1',
    price: new Prisma.Decimal('12000000'),
    isActive: true,
    branch: { id: 'fargona', name: 'F' },
  };
  const unique = () =>
    new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    });

  beforeEach(() => {
    prisma = {
      transportType: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'fura' }),
        create: jest.fn().mockResolvedValue({ id: 'fura' }),
        update: jest.fn().mockResolvedValue({ id: 'fura' }),
      },
      region: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue({ id: 'toshkent' }),
        create: jest.fn().mockResolvedValue({ id: 'toshkent' }),
        update: jest.fn().mockResolvedValue({ id: 'toshkent' }),
      },
      branch: { findUnique: jest.fn().mockResolvedValue({ id: 'fargona' }) },
      branchRegionTariff: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([tariffRow]),
        findUnique: jest.fn().mockResolvedValue({ branchId: 'fargona' }),
        upsert: jest.fn().mockResolvedValue(tariffRow),
        update: jest.fn().mockResolvedValue(tariffRow),
      },
    };
    service = new DeliveryAdminService(
      prisma as unknown as PrismaService,
      new BranchScopeService(),
    );
  });

  describe('ma’lumotnomalar', () => {
    it('nom band — 409', async () => {
      prisma.transportType.create.mockRejectedValueOnce(unique());
      await expect(
        service.createTransportType({ name: 'Fura', capacityPallets: 20 }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('nom trim qilinadi', async () => {
      await service.createRegion({ name: '  Namangan  ' });
      expect(prisma.region.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { name: 'Namangan' } }),
      );
    });

    it('o‘chirish — soft; mavjud emas — 404', async () => {
      await service.deactivateTransportType('fura');
      expect(prisma.transportType.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
      prisma.region.findUnique.mockResolvedValueOnce(null);
      await expect(service.deactivateRegion('yoq')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('isActive filtri', async () => {
      await service.findRegions({ isActive: false });
      expect(prisma.region.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: false } }),
      );
    });
  });

  describe('🔒 tariflar', () => {
    const dto = {
      regionId: 'toshkent',
      transportTypeId: 'fura',
      price: '12000000',
    };

    it('filial admini ro‘yxati — o‘z filialiga majburlanadi', async () => {
      await service.findTariffs(
        fargonaAdmin,
        Object.assign(new TariffQueryDto(), {}),
      );
      expect(prisma.branchRegionTariff.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { branchId: 'fargona' } }),
      );
    });

    it('filial admini boshqa filialni so‘rasa — 404', async () => {
      await expect(
        service.findTariffs(
          fargonaAdmin,
          Object.assign(new TariffQueryDto(), { branchId: 'andijon' }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('upsert — filial admini branchId bermasa o‘z filiali; kalit uchlik', async () => {
      const result = await service.upsertTariff(fargonaAdmin, dto);
      expect(prisma.branchRegionTariff.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            branchId_regionId_transportTypeId: {
              branchId: 'fargona',
              regionId: 'toshkent',
              transportTypeId: 'fura',
            },
          },
          update: { price: '12000000' },
        }),
      );
      expect(result.price).toBe('12000000');
    });

    it('filial admini boshqa filialga — 404, yozilmaydi', async () => {
      await expect(
        service.upsertTariff(fargonaAdmin, { ...dto, branchId: 'andijon' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.branchRegionTariff.upsert).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN filial bermasa — 400', async () => {
      await expect(
        service.upsertTariff(superAdmin, dto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('viloyat topilmadi — 400', async () => {
      prisma.region.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.upsertTariff(superAdmin, { ...dto, branchId: 'fargona' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('narxni o‘zgartirish — boshqa filial tarifi 404', async () => {
      prisma.branchRegionTariff.findUnique.mockResolvedValueOnce({
        branchId: 'andijon',
      });
      await expect(
        service.updateTariffPrice(fargonaAdmin, 't9', { price: '1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.branchRegionTariff.update).not.toHaveBeenCalled();
    });
  });
});
