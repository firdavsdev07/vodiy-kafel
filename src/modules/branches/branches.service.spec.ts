import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { BranchType, UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import type { PrismaService } from '../../prisma';
import { BranchesService } from './branches.service';

/** B-041 · filiallar. */
describe('BranchesService (B-041)', () => {
  let service: BranchesService;
  let branch: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let storage: { save: jest.Mock; delete: jest.Mock };

  const staff = (role: UserRole, branchId: string | null): Actor => ({
    id: 'u1',
    type: 'USER',
    role,
    branchId,
  });
  const superAdmin = staff(UserRole.SUPER_ADMIN, null);
  const fargonaAdmin = staff(UserRole.BRANCH_ADMIN, 'fargona');

  const row = (over: Record<string, unknown> = {}) => ({
    id: 'fargona',
    name: 'Farg‘ona',
    buildingImageUrl: '/uploads/branches/old.jpg',
    type: BranchType.RETAIL,
    ...over,
  });
  // JPEG sarlavhasi — detectFileKind uni jpg deb taniydi.
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);

  beforeEach(() => {
    branch = {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(row()),
      findUnique: jest.fn().mockResolvedValue(row()),
      create: jest.fn().mockResolvedValue(row()),
      update: jest.fn().mockResolvedValue(row()),
    };
    storage = {
      save: jest.fn().mockResolvedValue({ url: '/uploads/branches/new.jpg' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    service = new BranchesService(
      { branch } as unknown as PrismaService,
      new BranchScopeService(),
      storage,
    );
  });

  describe('🔒 ochiq', () => {
    it('ro‘yxat — faqat faol RETAIL, type va ichki maydonlarsiz', async () => {
      await service.findAllPublic();
      const [args] = branch.findMany.mock.calls[0] as [
        { where: unknown; select: Record<string, unknown> },
      ];
      expect(args.where).toEqual({ isActive: true, type: BranchType.RETAIL });
      expect(args.select).not.toHaveProperty('type');
      expect(args.select).not.toHaveProperty('isActive');
      expect(args.select).not.toHaveProperty('sortOrder');
    });

    it('bitta — CENTRAL yoki yopilgan bo‘lsa 404', async () => {
      branch.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOnePublic('markaz')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(branch.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'markaz', isActive: true, type: BranchType.RETAIL },
        }),
      );
    });
  });

  describe('admin', () => {
    it('🔒 filial admini ro‘yxatda faqat o‘z filialini ko‘radi', async () => {
      await service.findAllAdmin(fargonaAdmin, {});
      expect(branch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'fargona' } }),
      );
    });

    it('SUPER_ADMIN — hammasi, filtrlar bilan', async () => {
      await service.findAllAdmin(superAdmin, {
        type: BranchType.CENTRAL,
        isActive: false,
      });
      expect(branch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: BranchType.CENTRAL, isActive: false },
        }),
      );
    });

    it('🔒 boshqa filial — 404, bazaga ham bormaydi', async () => {
      await expect(
        service.findOneAdmin(fargonaAdmin, 'andijon'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(branch.findUnique).not.toHaveBeenCalled();
    });

    it('filial admini kontaktni tahrirlaydi', async () => {
      await service.update(fargonaAdmin, 'fargona', {
        phones: ['+998 73 244 00 00'],
        workingHours: 'Du–Sh',
      });
      expect(branch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { phones: ['+998 73 244 00 00'], workingHours: 'Du–Sh' },
        }),
      );
    });

    it.each([['name'], ['isActive'], ['sortOrder'], ['city']])(
      '🔒 filial admini %s ni o‘zgartira olmaydi — 403',
      async (field) => {
        const value =
          field === 'isActive' ? false : field === 'sortOrder' ? 1 : 'X';
        await expect(
          service.update(fargonaAdmin, 'fargona', { [field]: value }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(branch.update).not.toHaveBeenCalled();
      },
    );

    it('SUPER_ADMIN — istalgan maydon', async () => {
      await service.update(superAdmin, 'fargona', {
        name: 'Yangi nom',
        isActive: false,
      });
      expect(branch.update).toHaveBeenCalled();
    });
  });

  describe('bino surati', () => {
    it('saqlanadi, bazaga yoziladi, ESKISI keyin o‘chiriladi', async () => {
      await service.uploadImage(fargonaAdmin, 'fargona', {
        buffer: jpeg,
        size: jpeg.length,
      });
      expect(storage.save).toHaveBeenCalledWith({
        buffer: jpeg,
        folder: 'branches',
        extension: 'jpg',
      });
      expect(branch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { buildingImageUrl: '/uploads/branches/new.jpg' },
        }),
      );
      expect(storage.delete).toHaveBeenCalledWith('/uploads/branches/old.jpg');
    });

    it('baza yiqilsa — YANGI fayl o‘chiriladi, eskisi qoladi', async () => {
      branch.update.mockRejectedValueOnce(new Error('db'));
      await expect(
        service.uploadImage(superAdmin, 'fargona', {
          buffer: jpeg,
          size: jpeg.length,
        }),
      ).rejects.toThrow('db');
      expect(storage.delete).toHaveBeenCalledTimes(1);
      expect(storage.delete).toHaveBeenCalledWith('/uploads/branches/new.jpg');
    });

    it('🔒 rasm emas (SVG/HTML) — 400, saqlanmaydi', async () => {
      const html = Buffer.from('<svg onload="alert(1)">');
      await expect(
        service.uploadImage(superAdmin, 'fargona', {
          buffer: html,
          size: html.length,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('🔒 boshqa filialga — 404', async () => {
      await expect(
        service.uploadImage(fargonaAdmin, 'andijon', {
          buffer: jpeg,
          size: jpeg.length,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.save).not.toHaveBeenCalled();
    });
  });
});
