import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, PrismaService } from '../../prisma';
import { STORAGE_SERVICE } from '../../storage';
import { CategoriesService } from './categories.service';

/**
 * B-067 · kategoriyalar. Diqqat markazida:
 *   • ochiq javobga ichki maydonlar (isActive, sortOrder) CHIQMASLIGI
 *   • slug yaratilgandan keyin O'ZGARMASLIGI (havolalar buzilmasin)
 *   • soft delete — yozuv o'chirilmasligi
 *   • muqova surati — eskisi yangisi saqlangandan KEYIN o'chirilishi
 */
describe('CategoriesService (B-067)', () => {
  let service: CategoriesService;
  let findMany: jest.Mock;
  let findFirst: jest.Mock;
  let findUnique: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
  let storage: { save: jest.Mock; delete: jest.Mock; read: jest.Mock };

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  const row = (over: Record<string, unknown> = {}) => ({
    id: 'c1',
    name: 'Keramogranit',
    nameEn: 'Porcelain stoneware',
    slug: 'keramogranit',
    tagline: 'Eng zich, eng chidamli yuza',
    description: null,
    coverImageUrl: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    _count: { products: 12 },
    ...over,
  });

  beforeEach(async () => {
    findMany = jest.fn();
    findFirst = jest.fn();
    findUnique = jest.fn();
    create = jest.fn();
    update = jest.fn();
    storage = { save: jest.fn(), delete: jest.fn(), read: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: {
            category: { findMany, findFirst, findUnique, create, update },
          },
        },
        { provide: STORAGE_SERVICE, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get(CategoriesService);
  });

  describe('findAllPublic', () => {
    it('faqat FAOL kategoriyalarni so‘raydi', async () => {
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
      expect(arg.select.name).toBe(true);
      expect(arg.select.coverImageUrl).toBe(true);
    });

    it('tartib: sortOrder, keyin nom', async () => {
      findMany.mockResolvedValue([]);
      await service.findAllPublic();

      const arg = (findMany.mock.calls as [{ orderBy: unknown }][])[0][0];
      expect(arg.orderBy).toEqual([{ sortOrder: 'asc' }, { name: 'asc' }]);
    });
  });

  describe('findOneBySlug', () => {
    it('faqat FAOL kategoriyani topadi', async () => {
      findFirst.mockResolvedValue(row());
      await service.findOneBySlug('keramogranit');

      const arg = (
        findFirst.mock.calls as [
          { where: { slug: string; isActive: boolean } },
        ][]
      )[0][0];
      expect(arg.where).toEqual({ slug: 'keramogranit', isActive: true });
    });

    it('topilmasa — 404', async () => {
      findFirst.mockResolvedValue(null);
      await expect(service.findOneBySlug('yoq')).rejects.toThrow(
        NotFoundException,
      );
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

      expect(dto.productCount).toBe(12);
      expect(dto).not.toHaveProperty('_count');
    });
  });

  describe('create', () => {
    it('slug nomdan yasaladi', async () => {
      create.mockResolvedValue(row({ slug: 'marmar-effekt' }));

      await service.create({ name: 'Marmar effekt' });

      const arg = (create.mock.calls as [{ data: { slug: string } }][])[0][0];
      expect(arg.data.slug).toBe('marmar-effekt');
    });

    it('nomdan slug chiqmasa → 409 (bazaga urinmaydi ham)', async () => {
      await expect(service.create({ name: '!!! ???' })).rejects.toThrow(
        ConflictException,
      );
      expect(create).not.toHaveBeenCalled();
    });

    it('band slug (P2002) → 409, nom bilan tushunarli xabar', async () => {
      create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.create({ name: 'Keramogranit' })).rejects.toThrow(
        /Keramogranit/,
      );
    });

    it('boshqa xato yutib yuborilmaydi', async () => {
      create.mockRejectedValue(new Error('baza uzildi'));
      await expect(service.create({ name: 'Yangi' })).rejects.toThrow(
        'baza uzildi',
      );
    });
  });

  describe('update', () => {
    it('🔒 nom o‘zgarsa ham slug ESKICHA qoladi', async () => {
      findUnique.mockResolvedValue({ id: 'c1' });
      update.mockResolvedValue(row({ name: 'Yangi nom' }));

      await service.update('c1', { name: 'Yangi nom' });

      const arg = (
        update.mock.calls as [{ data: Record<string, unknown> }][]
      )[0][0];
      expect(arg.data).not.toHaveProperty('slug');
    });

    it('mavjud bo‘lmagan kategoriya → 404, yangilashga urinmaydi', async () => {
      findUnique.mockResolvedValue(null);
      await expect(service.update('yo-q', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('🔒 yozuvni O‘CHIRMAYDI — faqat isActive: false qiladi', async () => {
      findUnique.mockResolvedValue({ id: 'c1' });
      update.mockResolvedValue(row({ isActive: false }));

      const dto = await service.softDelete('c1');

      const arg = (
        update.mock.calls as [{ data: Record<string, unknown> }][]
      )[0][0];
      expect(arg.data).toEqual({ isActive: false });
      expect(dto.isActive).toBe(false);
    });

    it('mavjud bo‘lmagan kategoriya → 404', async () => {
      findUnique.mockResolvedValue(null);
      await expect(service.softDelete('yo-q')).rejects.toThrow(
        NotFoundException,
      );
      expect(update).not.toHaveBeenCalled();
    });
  });

  describe('uploadImage', () => {
    it('yangi surat saqlanadi va yozuvga yoziladi', async () => {
      findUnique.mockResolvedValue({ coverImageUrl: null });
      storage.save.mockResolvedValue({ url: '/uploads/categories/new.jpg' });
      update.mockResolvedValue(
        row({ coverImageUrl: '/uploads/categories/new.jpg' }),
      );

      const dto = await service.uploadImage('c1', {
        buffer: jpeg,
        size: jpeg.length,
      });

      expect(storage.save).toHaveBeenCalledWith({
        buffer: jpeg,
        folder: 'categories',
        extension: 'jpg',
      });
      expect(dto.coverImageUrl).toBe('/uploads/categories/new.jpg');
    });

    it('🔒 eski surat yangisi saqlangandan KEYIN o‘chiriladi', async () => {
      findUnique.mockResolvedValue({
        coverImageUrl: '/uploads/categories/old.jpg',
      });
      storage.save.mockResolvedValue({ url: '/uploads/categories/new.jpg' });
      update.mockResolvedValue(
        row({ coverImageUrl: '/uploads/categories/new.jpg' }),
      );

      await service.uploadImage('c1', { buffer: jpeg, size: jpeg.length });

      expect(storage.delete).toHaveBeenCalledWith(
        '/uploads/categories/old.jpg',
      );
    });

    it('baza yangilanmasa — yangi fayl o‘chiriladi, eskisi qoladi', async () => {
      findUnique.mockResolvedValue({
        coverImageUrl: '/uploads/categories/old.jpg',
      });
      storage.save.mockResolvedValue({ url: '/uploads/categories/new.jpg' });
      update.mockRejectedValue(new Error('db'));

      await expect(
        service.uploadImage('c1', { buffer: jpeg, size: jpeg.length }),
      ).rejects.toThrow('db');

      expect(storage.delete).toHaveBeenCalledTimes(1);
      expect(storage.delete).toHaveBeenCalledWith(
        '/uploads/categories/new.jpg',
      );
    });

    it('🔒 rasm emas (SVG/HTML) — 400, saqlanmaydi', async () => {
      findUnique.mockResolvedValue({ coverImageUrl: null });
      const html = Buffer.from('<svg onload="alert(1)">');

      await expect(
        service.uploadImage('c1', { buffer: html, size: html.length }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('mavjud bo‘lmagan kategoriya → 404', async () => {
      findUnique.mockResolvedValue(null);
      await expect(
        service.uploadImage('yo-q', { buffer: jpeg, size: jpeg.length }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.save).not.toHaveBeenCalled();
    });
  });
});
