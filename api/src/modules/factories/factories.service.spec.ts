import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, PrismaService } from '../../prisma';
import { FactoriesService } from './factories.service';

/**
 * B-018 · zavodlar. Diqqat markazida:
 *   • ochiq javobga ichki maydonlar (isActive, sortOrder) CHIQMASLIGI
 *   • slug yaratilgandan keyin O'ZGARMASLIGI (havolalar buzilmasin)
 *   • soft delete — yozuv o'chirilmasligi
 */
describe('FactoriesService (B-018)', () => {
  let service: FactoriesService;
  let findMany: jest.Mock;
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;

  const row = (over: Record<string, unknown> = {}) => ({
    id: 'f1',
    name: 'YONGXIN',
    slug: 'yongxin',
    logoUrl: '/uploads/yongxin.png',
    description: null,
    websiteUrl: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    _count: { products: 7 },
    ...over,
  });

  beforeEach(async () => {
    findMany = jest.fn();
    findUnique = jest.fn();
    create = jest.fn();
    update = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FactoriesService,
        {
          provide: PrismaService,
          useValue: { factory: { findMany, findUnique, create, update } },
        },
      ],
    }).compile();

    service = moduleRef.get(FactoriesService);
  });

  describe('findAllPublic', () => {
    it('faqat FAOL zavodlarni so‘raydi', async () => {
      findMany.mockResolvedValue([]);
      await service.findAllPublic();

      const arg = (
        findMany.mock.calls as [{ where: { isActive: boolean } }][]
      )[0][0];
      expect(arg.where).toEqual({ isActive: true });
    });

    it('🔒 ochiq select’da isActive va sortOrder YO‘Q', async () => {
      findMany.mockResolvedValue([]);
      await service.findAllPublic();

      const arg = (
        findMany.mock.calls as [{ select: Record<string, boolean> }][]
      )[0][0];
      expect(arg.select.isActive).toBeUndefined();
      expect(arg.select.sortOrder).toBeUndefined();
      expect(arg.select.createdAt).toBeUndefined();
      expect(arg.select.name).toBe(true);
      expect(arg.select.logoUrl).toBe(true);
    });

    it('tartib: sortOrder, keyin nom (teng qiymatlar tasodifiy joylashmasin)', async () => {
      findMany.mockResolvedValue([]);
      await service.findAllPublic();

      const arg = (findMany.mock.calls as [{ orderBy: unknown }][])[0][0];
      expect(arg.orderBy).toEqual([{ sortOrder: 'asc' }, { name: 'asc' }]);
    });
  });

  describe('findAllAdmin', () => {
    it('o‘chirilganlar ham chiqadi (where filtri yo‘q)', async () => {
      findMany.mockResolvedValue([]);
      await service.findAllAdmin();

      const arg = (findMany.mock.calls as [{ where?: unknown }][])[0][0];
      expect(arg.where).toBeUndefined();
    });

    it('_count → productCount ga o‘giriladi va `_count` javobda qolmaydi', async () => {
      findMany.mockResolvedValue([row()]);

      const [dto] = await service.findAllAdmin();

      expect(dto.productCount).toBe(7);
      expect(dto).not.toHaveProperty('_count');
    });
  });

  describe('create', () => {
    it('slug nomdan yasaladi', async () => {
      create.mockResolvedValue(row({ slug: 'hua-tao' }));

      await service.create({ name: 'Hua Tao', logoUrl: '/l.png' });

      const arg = (create.mock.calls as [{ data: { slug: string } }][])[0][0];
      expect(arg.data.slug).toBe('hua-tao');
    });

    it('o‘zbekcha apostrof slug’ni buzmaydi', async () => {
      create.mockResolvedValue(row());

      await service.create({ name: 'Qo‘qon Seramika', logoUrl: '/l.png' });

      const arg = (create.mock.calls as [{ data: { slug: string } }][])[0][0];
      expect(arg.data.slug).toBe('qoqon-seramika');
    });

    it('nomdan slug chiqmasa → 409 (bazaga urinmaydi ham)', async () => {
      await expect(
        service.create({ name: '!!! ???', logoUrl: '/l.png' }),
      ).rejects.toThrow(ConflictException);

      expect(create).not.toHaveBeenCalled();
    });

    it('band slug (P2002) → 409, nom bilan tushunarli xabar', async () => {
      create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        service.create({ name: 'YONGXIN', logoUrl: '/l.png' }),
      ).rejects.toThrow(/YONGXIN/);
    });

    it('boshqa xato yutib yuborilmaydi', async () => {
      create.mockRejectedValue(new Error('baza uzildi'));

      await expect(
        service.create({ name: 'Yangi', logoUrl: '/l.png' }),
      ).rejects.toThrow('baza uzildi');
    });
  });

  describe('update', () => {
    it('🔒 nom o‘zgarsa ham slug ESKICHA qoladi', async () => {
      findUnique.mockResolvedValue({ id: 'f1' });
      update.mockResolvedValue(row({ name: 'Yangi nom' }));

      await service.update('f1', { name: 'Yangi nom' });

      const arg = (
        update.mock.calls as [{ data: Record<string, unknown> }][]
      )[0][0];
      expect(arg.data).not.toHaveProperty('slug');
    });

    it('mavjud bo‘lmagan zavod → 404, yangilashga urinmaydi', async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.update('yo-q', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(update).not.toHaveBeenCalled();
    });

    it('isActive: true bilan qayta faollashtirish mumkin', async () => {
      findUnique.mockResolvedValue({ id: 'f1' });
      update.mockResolvedValue(row({ isActive: true }));

      const dto = await service.update('f1', { isActive: true });

      expect(dto.isActive).toBe(true);
    });
  });

  describe('softDelete', () => {
    it('🔒 yozuvni O‘CHIRMAYDI — faqat isActive: false qiladi', async () => {
      findUnique.mockResolvedValue({ id: 'f1' });
      update.mockResolvedValue(row({ isActive: false }));

      const dto = await service.softDelete('f1');

      const arg = (
        update.mock.calls as [{ data: Record<string, unknown> }][]
      )[0][0];
      expect(arg.data).toEqual({ isActive: false });
      expect(dto.isActive).toBe(false);
      // Ta'sir doirasi ko'rinadi: nechta mahsulot bog'langan.
      expect(dto.productCount).toBe(7);
    });

    it('mavjud bo‘lmagan zavod → 404', async () => {
      findUnique.mockResolvedValue(null);

      await expect(service.softDelete('yo-q')).rejects.toThrow(
        NotFoundException,
      );
      expect(update).not.toHaveBeenCalled();
    });
  });
});
