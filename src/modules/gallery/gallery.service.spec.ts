import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../prisma';
import { STORAGE_SERVICE } from '../../storage';
import { GalleryAdminQueryDto } from './dto';
import { GalleryService } from './gallery.service';

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const MP4 = Buffer.concat([
  Buffer.from([0, 0, 0, 0x18]),
  Buffer.from('ftypisom'),
]);

/** B-024 · loyiha galereyasi. */
describe('GalleryService (B-024)', () => {
  let service: GalleryService;
  let prisma: {
    galleryItem: Record<string, jest.Mock>;
    product: { findUnique: jest.Mock };
  };
  let storage: { save: jest.Mock; delete: jest.Mock };

  const item = (over: Record<string, unknown> = {}) => ({
    id: 'g1',
    imageUrl: '/uploads/gallery/a.jpg',
    title: null,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    product: null,
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      galleryItem: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(item()),
        create: jest.fn().mockResolvedValue(item()),
        update: jest.fn().mockResolvedValue(item()),
        delete: jest.fn().mockResolvedValue(item()),
      },
      product: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
    };
    storage = {
      save: jest.fn().mockResolvedValue({ url: '/uploads/gallery/new.jpg' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        GalleryService,
        { provide: PrismaService, useValue: prisma },
        { provide: STORAGE_SERVICE, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get(GalleryService);
  });

  describe('findPublic', () => {
    const product = (isActive: boolean, factoryActive: boolean) => ({
      id: 'p1',
      name: 'Lyuks',
      slug: 'lyuks',
      isActive,
      factory: { isActive: factoryActive },
    });

    it('faqat faol rasmlar so‘raladi', async () => {
      await service.findPublic(new PaginationQueryDto());
      const arg = (
        prisma.galleryItem.findMany.mock.calls as [{ where: unknown }][]
      )[0][0];
      expect(arg.where).toEqual({ isActive: true });
    });

    it('🔒 mahsulot havolasi faqat vitrinada ko‘rinsa; aks holda null, rasm qoladi', async () => {
      prisma.galleryItem.findMany.mockResolvedValueOnce([
        { id: 'g1', imageUrl: 'a', title: null, product: product(true, true) },
        { id: 'g2', imageUrl: 'b', title: null, product: product(false, true) },
        { id: 'g3', imageUrl: 'c', title: null, product: product(true, false) },
        { id: 'g4', imageUrl: 'd', title: null, product: null },
      ]);

      const result = await service.findPublic(new PaginationQueryDto());

      expect(result.items.map((row) => row.product)).toEqual([
        { id: 'p1', name: 'Lyuks', slug: 'lyuks' },
        null,
        null,
        null,
      ]);
      expect(result.items[0].product).not.toHaveProperty('isActive');
    });
  });

  describe('findAdmin', () => {
    it('isActive=false va productId filtrlari', async () => {
      await service.findAdmin(
        Object.assign(new GalleryAdminQueryDto(), {
          isActive: false,
          productId: 'p1',
        }),
      );
      const arg = (
        prisma.galleryItem.findMany.mock.calls as [{ where: unknown }][]
      )[0][0];
      expect(arg.where).toEqual({ isActive: false, productId: 'p1' });
    });
  });

  describe('create', () => {
    it('rasm saqlanadi va yozuv yaratiladi', async () => {
      await service.create(
        { buffer: JPG, size: JPG.length },
        { title: 'Oshxona', productId: 'p1' },
      );
      expect(storage.save).toHaveBeenCalledWith(
        expect.objectContaining({ folder: 'gallery', extension: 'jpg' }),
      );
      const arg = (
        prisma.galleryItem.create.mock.calls as [{ data: unknown }][]
      )[0][0];
      expect(arg.data).toEqual({
        title: 'Oshxona',
        productId: 'p1',
        imageUrl: '/uploads/gallery/new.jpg',
      });
    });

    it('video — 400 (galereya faqat rasm)', async () => {
      await expect(
        service.create({ buffer: MP4, size: MP4.length }, {}),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('mahsulot topilmadi — 400, fayl saqlanmaydi', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create({ buffer: JPG, size: JPG.length }, { productId: 'x' }),
      ).rejects.toThrow('Mahsulot topilmadi');
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('baza xato bersa — fayl o‘chiriladi', async () => {
      prisma.galleryItem.create.mockRejectedValueOnce(new Error('db'));
      await expect(
        service.create({ buffer: JPG, size: JPG.length }, {}),
      ).rejects.toThrow('db');
      expect(storage.delete).toHaveBeenCalledWith('/uploads/gallery/new.jpg');
    });
  });

  describe('update', () => {
    it('productId: null — bog‘lanish uziladi, mahsulot tekshirilmaydi', async () => {
      await service.update('g1', { productId: null });
      expect(prisma.product.findUnique).not.toHaveBeenCalled();
      const arg = (
        prisma.galleryItem.update.mock.calls as [{ data: unknown }][]
      )[0][0];
      expect(arg.data).toEqual({ productId: null });
    });

    it('yangi mahsulot topilmadi — 400', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.update('g1', { productId: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.galleryItem.update).not.toHaveBeenCalled();
    });

    it('rasm yo‘q — 404', async () => {
      prisma.galleryItem.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('x', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('yozuv va fayl o‘chiriladi', async () => {
      await service.remove('g1');
      expect(prisma.galleryItem.delete).toHaveBeenCalledWith({
        where: { id: 'g1' },
      });
      expect(storage.delete).toHaveBeenCalledWith('/uploads/gallery/a.jpg');
    });

    it('rasm yo‘q — 404, fayl tegilmaydi', async () => {
      prisma.galleryItem.findUnique.mockResolvedValueOnce(null);
      await expect(service.remove('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(storage.delete).not.toHaveBeenCalled();
    });
  });
});
