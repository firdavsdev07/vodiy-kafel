import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthService } from '../../auth/auth.service';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { BranchType, UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, type PrismaService } from '../../prisma';
import { StaffAdminService } from './staff-admin.service';

/** B-043 / B-057 · xodimlar. */
describe('StaffAdminService', () => {
  let service: StaffAdminService;
  let user: Record<string, jest.Mock>;
  let branch: { findUnique: jest.Mock };
  let customer: { findUnique: jest.Mock };

  const staff = (role: UserRole, branchId: string | null): Actor => ({
    id: 'u1',
    type: 'USER',
    role,
    branchId,
  });
  const superAdmin = staff(UserRole.SUPER_ADMIN, null);
  const fargonaAdmin = staff(UserRole.BRANCH_ADMIN, 'fargona');
  const row = {
    id: 'm1',
    fullName: 'Menejer',
    phone: '+998901234567',
    telegramUsername: null,
    role: UserRole.MANAGER,
    isActive: true,
    branch: { id: 'fargona', name: 'F' },
  };
  const dto = { fullName: ' Vali ', phone: '+998901112233' };

  beforeEach(() => {
    user = {
      findMany: jest.fn().mockResolvedValue([row]),
      findFirst: jest
        .fn()
        .mockResolvedValue({ branchId: 'fargona', phone: row.phone }),
      create: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue(row),
    };
    branch = {
      findUnique: jest
        .fn()
        .mockResolvedValue({ type: BranchType.RETAIL, isActive: true }),
    };
    // 🆕 2026-09-18: `assertPhoneNotCustomer` — default holatda hech kim
    // shu raqamda emas (aks holda create/update har doim 409 berardi).
    customer = { findUnique: jest.fn().mockResolvedValue(null) };
    service = new StaffAdminService(
      { user, branch, customer } as unknown as PrismaService,
      {
        hashPassword: (p: string) => Promise.resolve(`hash(${p})`),
      } as unknown as AuthService,
      new BranchScopeService(),
    );
  });

  describe('ro‘yxat', () => {
    it('🔒 filial admini — faqat o‘z filiali va faqat shu rol', async () => {
      await service.findAll(fargonaAdmin, 'MANAGER', {});
      const [{ where, select }] = user.findMany.mock.calls[0] as [
        { where: Record<string, unknown>; select: Record<string, unknown> },
      ];
      expect(where).toMatchObject({
        role: UserRole.MANAGER,
        branchId: 'fargona',
      });
      expect(select).not.toHaveProperty('passwordHash');
    });

    it('🔒 boshqa filial so‘ralsa — 404', async () => {
      await expect(
        service.findAll(fargonaAdmin, 'MANAGER', { branchId: 'andijon' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('yaratish', () => {
    it('filial admini — o‘z filialiga, vaqtinchalik parol hash bilan', async () => {
      const result = await service.create(fargonaAdmin, 'MANAGER', dto);
      const [{ data }] = user.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(data).toMatchObject({
        fullName: 'Vali',
        role: UserRole.MANAGER,
        branchId: 'fargona',
        telegramUsername: null,
      });
      expect(data.passwordHash).toBe(`hash(${result.temporaryPassword})`);
      expect(result.temporaryPassword).toHaveLength(12);
    });

    it('admin bergan parol ishlatiladi, tizim yangisini o‘ylab topmaydi (B-066)', async () => {
      const result = await service.create(fargonaAdmin, 'MANAGER', {
        ...dto,
        password: 'MenejerParol1',
      });
      const [{ data }] = user.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(result.temporaryPassword).toBe('MenejerParol1');
      expect(data.passwordHash).toBe('hash(MenejerParol1)');
    });

    it('🔒 menejer CENTRAL filialga — 400', async () => {
      branch.findUnique.mockResolvedValueOnce({
        type: BranchType.CENTRAL,
        isActive: true,
      });
      await expect(
        service.create(superAdmin, 'MANAGER', { ...dto, branchId: 'markaz' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.create).not.toHaveBeenCalled();
    });

    it('🔒 moderator RETAIL filialga — 400 (B-057)', async () => {
      await expect(
        service.create(superAdmin, 'MODERATOR', {
          ...dto,
          branchId: 'fargona',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('yopiq filial — 400; SUPER_ADMIN filial bermasa — 400', async () => {
      branch.findUnique.mockResolvedValueOnce({
        type: BranchType.RETAIL,
        isActive: false,
      });
      await expect(
        service.create(superAdmin, 'MANAGER', { ...dto, branchId: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create(superAdmin, 'MANAGER', dto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('🔒 filial admini boshqa filialga — 404', async () => {
      await expect(
        service.create(fargonaAdmin, 'MANAGER', {
          ...dto,
          branchId: 'andijon',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('telefon band — 409', async () => {
      user.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.create(fargonaAdmin, 'MANAGER', dto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('🆕 2026-09-18: telefon allaqachon OPTOM MIJOZDA bor — 409, xodim yozilmaydi', async () => {
      customer.findUnique.mockResolvedValueOnce({ id: 'customer-1' });
      await expect(
        service.create(fargonaAdmin, 'MANAGER', dto),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(customer.findUnique).toHaveBeenCalledWith({
        where: { phone: dto.phone },
        select: { id: true },
      });
      expect(user.create).not.toHaveBeenCalled();
    });
  });

  describe('tahrirlash', () => {
    it('🔒 boshqa rol ID si (masalan admin) — 404', async () => {
      user.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.update(superAdmin, 'MANAGER', 'admin-id', { fullName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'admin-id', role: UserRole.MANAGER },
        }),
      );
    });

    it('🔒 boshqa filial menejeri — 404', async () => {
      user.findFirst.mockResolvedValueOnce({ branchId: 'andijon' });
      await expect(
        service.update(fargonaAdmin, 'MANAGER', 'm2', { isActive: false }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(user.update).not.toHaveBeenCalled();
    });

    it('🔒 filial admini menejerni boshqa filialga o‘tkaza olmaydi — 404', async () => {
      await expect(
        service.update(fargonaAdmin, 'MANAGER', 'm1', { branchId: 'andijon' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('faqat berilgan maydonlar; telegram null — tozalash', async () => {
      await service.update(fargonaAdmin, 'MANAGER', 'm1', {
        telegramUsername: null,
        isActive: false,
      });
      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { telegramUsername: null, isActive: false },
        }),
      );
    });

    it('🆕 telefon o‘zgarmasa — mijoz bilan to‘qnashuv TEKSHIRILMAYDI', async () => {
      await service.update(fargonaAdmin, 'MANAGER', 'm1', {
        phone: row.phone, // aynan hozirgisi bilan bir xil
      });
      expect(customer.findUnique).not.toHaveBeenCalled();
    });

    it('🆕 2026-09-18: yangi telefon OPTOM MIJOZDA bor — 409, saqlanmaydi', async () => {
      customer.findUnique.mockResolvedValueOnce({ id: 'customer-1' });
      await expect(
        service.update(fargonaAdmin, 'MANAGER', 'm1', {
          phone: '+998933000009',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(customer.findUnique).toHaveBeenCalledWith({
        where: { phone: '+998933000009' },
        select: { id: true },
      });
      expect(user.update).not.toHaveBeenCalled();
    });
  });

  describe('parol tiklash (B-066)', () => {
    beforeEach(() => {
      user.update.mockResolvedValue({ phone: '+998901234567' });
    });

    it('admin bergan parol o‘rnatiladi; javobda login ham qaytadi', async () => {
      const result = await service.resetPassword(
        fargonaAdmin,
        'MANAGER',
        'm1',
        {
          password: 'YangiParol1',
        },
      );
      expect(result).toEqual({
        phone: '+998901234567',
        password: 'YangiParol1',
      });
      expect(user.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { passwordHash: 'hash(YangiParol1)' },
        select: { phone: true },
      });
    });

    it('parol berilmasa — tizim 12 belgilik parol yaratadi', async () => {
      const result = await service.resetPassword(
        superAdmin,
        'MANAGER',
        'm1',
        {},
      );
      expect(result.password).toHaveLength(12);
      const [{ data }] = user.update.mock.calls[0] as [
        { data: { passwordHash: string } },
      ];
      expect(data.passwordHash).toBe(`hash(${result.password})`);
    });

    it('🔒 boshqa filial menejeri — 404, parol o‘zgarmaydi', async () => {
      user.findFirst.mockResolvedValueOnce({ branchId: 'andijon' });
      await expect(
        service.resetPassword(fargonaAdmin, 'MANAGER', 'm1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(user.update).not.toHaveBeenCalled();
    });

    it('🔒 boshqa rol ID si (moderator sifatida menejer) — 404', async () => {
      user.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.resetPassword(superAdmin, 'MODERATOR', 'm1', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1', role: UserRole.MODERATOR },
        }),
      );
    });
  });

  describe('moderatorlar (B-057)', () => {
    it('CENTRAL filialga — rol MODERATOR', async () => {
      branch.findUnique.mockResolvedValueOnce({
        type: BranchType.CENTRAL,
        isActive: true,
      });
      await service.create(superAdmin, 'MODERATOR', {
        ...dto,
        branchId: 'markaz',
      });
      const [{ data }] = user.create.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(data).toMatchObject({
        role: UserRole.MODERATOR,
        branchId: 'markaz',
      });
    });

    it('🔒 RETAIL filialga ko‘chirish — 400', async () => {
      user.findFirst.mockResolvedValueOnce({ branchId: 'markaz' });
      await expect(
        service.update(superAdmin, 'MODERATOR', 'mod1', {
          branchId: 'fargona',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.update).not.toHaveBeenCalled();
    });

    it('o‘chirish — soft, faqat MODERATOR roli bo‘yicha qidiriladi', async () => {
      user.findFirst.mockResolvedValueOnce({ branchId: 'markaz' });
      await service.deactivate(superAdmin, 'MODERATOR', 'mod1');
      expect(user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'mod1', role: UserRole.MODERATOR },
        }),
      );
      expect(user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });
  });
});
