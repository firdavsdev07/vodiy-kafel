import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { LeadStatus, UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import type { PrismaService } from '../../prisma';
import {
  LeadsService,
  leadReference,
  normalizeLeadPhone,
} from './leads.service';

const FARGONA = 'br_fargona';

const superAdmin: Actor = {
  id: 'u1',
  type: 'USER',
  role: UserRole.SUPER_ADMIN,
  branchId: null,
};
const moderator: Actor = {
  id: 'u2',
  type: 'USER',
  role: UserRole.MODERATOR,
  branchId: 'br_central',
};
const manager: Actor = {
  id: 'u3',
  type: 'USER',
  role: UserRole.MANAGER,
  branchId: FARGONA,
};

/** T-013 · saytdagi aloqa formasi. */
describe('LeadsService (T-013)', () => {
  let service: LeadsService;
  let lead: Record<string, jest.Mock>;
  let branch: { findFirst: jest.Mock };
  let events: { emit: jest.Mock };

  const row = {
    id: 'cmleadabc7h2k9q',
    name: 'Aziz',
    phone: '+998901234567',
    message: 'Salom',
    status: LeadStatus.NEW,
    note: null,
    branch: null,
    handledBy: null,
    handledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    lead = {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([row]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue({ id: row.id }),
      update: jest.fn().mockResolvedValue(row),
    };
    branch = { findFirst: jest.fn().mockResolvedValue({ id: FARGONA }) };
    events = { emit: jest.fn() };
    const prisma = {
      lead,
      branch,
      $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    };
    service = new LeadsService(
      prisma as unknown as PrismaService,
      new BranchScopeService(),
      events as unknown as EventEmitter2,
    );
  });

  describe('normalizeLeadPhone', () => {
    it.each([
      ['+998 (90) 123-45-67', '+998901234567'],
      ['90 123 45 67', '+998901234567'],
      ['998901234567', '+998901234567'],
      ['+7 912 345 67 89', '+79123456789'],
    ])('%s → %s', (input, expected) => {
      expect(normalizeLeadPhone(input)).toBe(expected);
    });

    it('juda qisqa yoki uzun — null', () => {
      expect(normalizeLeadPhone('12345678')).toBeNull();
      expect(normalizeLeadPhone('1234567890123456')).toBeNull();
    });
  });

  it('ma’lumotnoma — ID ning oxirgi 6 belgisi, katta harfda', () => {
    expect(leadReference('cmleadabc7h2k9q')).toBe('VK-7H2K9Q');
  });

  describe('create', () => {
    const dto = { name: 'Aziz', phone: '90 123 45 67', message: 'Salom' };

    it('yozadi, telefonni normallashtiradi, hodisa chiqaradi', async () => {
      const result = await service.create(dto);

      expect(lead.create).toHaveBeenCalledWith({
        data: {
          name: 'Aziz',
          phone: '+998901234567',
          message: 'Salom',
          branchId: null,
        },
        select: { id: true },
      });
      expect(events.emit).toHaveBeenCalledWith('lead.created', {
        leadId: row.id,
      });
      expect(result).toEqual({ reference: 'VK-7H2K9Q' });
    });

    it('🔒 bot tuzog‘i to‘lgan — hech narsa yozilmaydi, javob bir xil shaklda', async () => {
      const result = await service.create({ ...dto, website: 'http://spam' });

      expect(lead.create).not.toHaveBeenCalled();
      expect(lead.findFirst).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
      expect(result.reference).toMatch(/^VK-[A-Z0-9]{6}$/);
    });

    it('takror (shu telefon + matn, 10 daqiqa ichida) — yangi yozuv yo‘q', async () => {
      lead.findFirst.mockResolvedValue({ id: 'cmold000aaaaaa' });

      const result = await service.create(dto);

      expect(lead.create).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
      expect(result).toEqual({ reference: 'VK-AAAAAA' });
    });

    it('yaroqsiz telefon — 400', async () => {
      await expect(
        service.create({ ...dto, phone: '(12) 34-56-78' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(lead.create).not.toHaveBeenCalled();
    });

    it('do‘kon — faqat faol RETAIL; topilmasa 400', async () => {
      branch.findFirst.mockResolvedValue(null);
      await expect(
        service.create({ ...dto, branchId: 'br_central' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(branch.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'br_central', isActive: true, type: 'RETAIL' },
        }),
      );
      expect(lead.create).not.toHaveBeenCalled();
    });
  });

  describe('doira', () => {
    const whereOf = (mock: jest.Mock) =>
      (mock.mock.calls[0] as [{ where: Record<string, unknown> }])[0].where;

    it('SUPER_ADMIN va MODERATOR — hammasi (do‘konsizlari ham)', async () => {
      await service.findAdmin(superAdmin, { page: 1, limit: 20 } as never);
      expect(whereOf(lead.findMany)).toEqual({});

      lead.findMany.mockClear();
      await service.findAdmin(moderator, { page: 1, limit: 20 } as never);
      expect(whereOf(lead.findMany)).toEqual({});
    });

    it('🔒 menejer — faqat o‘z filiali', async () => {
      await service.findAdmin(manager, {
        page: 1,
        limit: 20,
        status: LeadStatus.NEW,
      } as never);
      expect(whereOf(lead.findMany)).toEqual({
        branchId: FARGONA,
        status: LeadStatus.NEW,
      });
    });

    it('🔒 menejer begona filialni so‘rasa — 404', async () => {
      await expect(
        service.findAdmin(manager, {
          page: 1,
          limit: 20,
          branchId: 'br_andijon',
        } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('🔒 menejer begona murojaatni o‘zgartira olmaydi — 404', async () => {
      lead.findFirst.mockResolvedValue(null);
      await expect(
        service.update(manager, row.id, { status: LeadStatus.DONE }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(whereOf(lead.findFirst)).toEqual({
        id: row.id,
        branchId: FARGONA,
      });
      expect(lead.update).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('holat o‘zgarsa — kim va qachon yoziladi', async () => {
      lead.findFirst.mockResolvedValue(row);
      await service.update(superAdmin, row.id, { status: LeadStatus.DONE });

      const [args] = lead.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(args.data).toMatchObject({
        status: LeadStatus.DONE,
        handledByUserId: superAdmin.id,
      });
      expect(args.data.handledAt).toBeInstanceOf(Date);
    });

    it('faqat izoh — handledBy tegilmaydi; bo‘sh izoh → null', async () => {
      lead.findFirst.mockResolvedValue(row);
      await service.update(superAdmin, row.id, {
        status: LeadStatus.NEW,
        note: '   ',
      });

      const [args] = lead.update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      expect(args.data).toEqual({ note: null });
    });
  });

  it('javobda ma’lumotnoma bor', async () => {
    const page = await service.findAdmin(superAdmin, {
      page: 1,
      limit: 20,
    } as never);
    expect(page.items[0].reference).toBe('VK-7H2K9Q');
    expect(page.total).toBe(1);
  });
});
