import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MediaType, PrismaService } from '../../prisma';
import { STORAGE_SERVICE } from '../../storage';
import { ProductMediaService } from './product-media.service';

const SAMPLE = {
  jpg: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  webp: Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.alloc(4),
    Buffer.from('WEBPVP8 '),
  ]),
  mp4: Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom')]),
};

/** B-022 · mahsulot media. */
describe('ProductMediaService (B-022)', () => {
  let service: ProductMediaService;
  let prisma: {
    product: { findUnique: jest.Mock };
    productMedia: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let storage: { save: jest.Mock; delete: jest.Mock };

  const media = (over: Record<string, unknown> = {}) => ({
    id: 'm1',
    productId: 'p1',
    url: '/uploads/products/a.jpg',
    type: MediaType.IMAGE,
    sortOrder: 0,
    createdAt: new Date('2026-01-01'),
    ...over,
  });

  const file = (buffer: Buffer) => ({ buffer, size: buffer.length });

  beforeEach(async () => {
    prisma = {
      product: { findUnique: jest.fn().mockResolvedValue({ id: 'p1' }) },
      productMedia: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 2 } }),
        create: jest.fn().mockResolvedValue(media()),
        delete: jest.fn().mockResolvedValue(media()),
        update: jest.fn().mockReturnValue('update-op'),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    storage = {
      save: jest.fn().mockResolvedValue({ url: '/uploads/products/new.jpg' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProductMediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: STORAGE_SERVICE, useValue: storage },
      ],
    }).compile();

    service = moduleRef.get(ProductMediaService);
  });

  describe('upload', () => {
    it('kengaytma MAZMUNDAN olinadi va oxiriga qo‘shiladi', async () => {
      await service.upload('p1', file(SAMPLE.webp));

      expect(storage.save).toHaveBeenCalledWith(
        expect.objectContaining({ folder: 'products', extension: 'webp' }),
      );
      const arg = (
        prisma.productMedia.create.mock.calls as [
          { data: Record<string, unknown> },
        ][]
      )[0][0];
      expect(arg.data).toMatchObject({
        url: '/uploads/products/new.jpg',
        type: MediaType.IMAGE,
        sortOrder: 3,
      });
    });

    it('birinchi media — sortOrder 0', async () => {
      prisma.productMedia.aggregate.mockResolvedValueOnce({
        _max: { sortOrder: null },
      });
      await service.upload('p1', file(SAMPLE.jpg));
      const arg = (
        prisma.productMedia.create.mock.calls as [
          { data: { sortOrder: number } },
        ][]
      )[0][0];
      expect(arg.data.sortOrder).toBe(0);
    });

    it('🔒 SVG/HTML — 400, diskka yozilmaydi', async () => {
      await expect(
        service.upload('p1', file(Buffer.from('<svg onload=alert(1)>'))),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('tur va fayl mos emas — 400 (video sifatida surat, surat sifatida video)', async () => {
      await expect(
        service.upload('p1', file(SAMPLE.jpg), MediaType.VIDEO_360),
      ).rejects.toThrow('MP4');
      await expect(
        service.upload('p1', file(SAMPLE.mp4), MediaType.IMAGE_360),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('fayl yo‘q yoki bo‘sh — 400', async () => {
      await expect(service.upload('p1', undefined)).rejects.toThrow(
        'Fayl yuborilmadi',
      );
      await expect(
        service.upload('p1', file(Buffer.alloc(0))),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('mahsulot yo‘q — 404, diskka yozilmaydi', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.upload('x', file(SAMPLE.jpg)),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.save).not.toHaveBeenCalled();
    });

    it('baza xato bersa — saqlangan fayl o‘chiriladi (egasiz fayl qolmaydi)', async () => {
      prisma.productMedia.create.mockRejectedValueOnce(new Error('db'));
      await expect(service.upload('p1', file(SAMPLE.jpg))).rejects.toThrow(
        'db',
      );
      expect(storage.delete).toHaveBeenCalledWith('/uploads/products/new.jpg');
    });
  });

  describe('remove', () => {
    it('avval yozuv, keyin fayl o‘chiriladi', async () => {
      const order: string[] = [];
      prisma.productMedia.findUnique.mockResolvedValueOnce(media());
      prisma.productMedia.delete.mockImplementationOnce(() => {
        order.push('db');
        return Promise.resolve(media());
      });
      storage.delete.mockImplementationOnce(() => {
        order.push('file');
        return Promise.resolve();
      });

      await service.remove('m1');
      expect(order).toEqual(['db', 'file']);
    });

    it('fayl o‘chmasa ham so‘rov muvaffaqiyatli', async () => {
      prisma.productMedia.findUnique.mockResolvedValueOnce(media());
      storage.delete.mockRejectedValueOnce(new Error('EACCES'));
      await expect(service.remove('m1')).resolves.toMatchObject({ id: 'm1' });
    });

    it('media yo‘q — 404', async () => {
      prisma.productMedia.findUnique.mockResolvedValueOnce(null);
      await expect(service.remove('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('reorder', () => {
    beforeEach(() => {
      prisma.productMedia.findMany.mockResolvedValueOnce([
        { id: 'm1' },
        { id: 'm2' },
        { id: 'm3' },
      ]);
    });

    it('to‘liq ro‘yxat — indeks bo‘yicha sortOrder', async () => {
      await service.reorder('p1', ['m3', 'm1', 'm2']);
      expect(prisma.productMedia.update.mock.calls).toEqual([
        [{ where: { id: 'm3' }, data: { sortOrder: 0 } }],
        [{ where: { id: 'm1' }, data: { sortOrder: 1 } }],
        [{ where: { id: 'm2' }, data: { sortOrder: 2 } }],
      ]);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['qisman', ['m1', 'm2']],
      ['begona ID (boshqa mahsulot surati)', ['m1', 'm2', 'boshqa']],
      ['ortiqcha', ['m1', 'm2', 'm3', 'm4']],
    ])('%s ro‘yxat — 400, hech narsa o‘zgarmaydi', async (_label, ids) => {
      await expect(service.reorder('p1', ids)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
