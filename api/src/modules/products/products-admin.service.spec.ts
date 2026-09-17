import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, PrismaService } from '../../prisma';
import { SettingsService } from '../settings/settings.service';
import { ProductAdminQueryDto } from './dto';
import { ProductStocksService } from './product-stocks.service';
import {
  buildProductSlug,
  ProductsAdminService,
} from './products-admin.service';

/** B-021 · mahsulot katalogi (admin). */
describe('ProductsAdminService (B-021)', () => {
  let service: ProductsAdminService;
  let prisma: {
    product: Record<string, jest.Mock>;
    productSize: { findUnique: jest.Mock };
    factory: { findUnique: jest.Mock };
  };

  const row = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    name: 'Lyuks Keramogranit',
    slug: 'lyuks-keramogranit-60x60',
    surface: 'POL',
    color: null,
    description: null,
    sqmPerPallet: new Prisma.Decimal('1.4400'),
    weightPerPallet: new Prisma.Decimal('32.500'),
    viewCount: 0,
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    factory: { id: 'f1', name: 'YONGXIN', slug: 'yongxin' },
    size: { id: 's1', label: '60x60', widthCm: 60, heightCm: 60 },
    stock: { stockPallets: 100, lowStockThreshold: null },
    // B-060: ADMIN_SELECT muqova uchun bitta IMAGE oladi (`take: 1`)
    media: [{ url: '/uploads/products/lyuks-60x60-1.webp' }],
    ...over,
  });

  const createDto = {
    name: 'Lyuks Keramogranit',
    factoryId: 'f1',
    sizeId: 's1',
    surface: 'POL' as const,
    sqmPerPallet: '1.44',
    weightPerPallet: '32.5',
  };

  let events: { emit: jest.Mock };

  beforeEach(async () => {
    events = { emit: jest.fn() };
    prisma = {
      product: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([row()]),
        findUnique: jest.fn().mockResolvedValue(row()),
        create: jest.fn().mockResolvedValue(row()),
        update: jest.fn().mockResolvedValue(row()),
      },
      productSize: {
        findUnique: jest.fn().mockResolvedValue({ label: '60x60' }),
      },
      factory: { findUnique: jest.fn().mockResolvedValue({ id: 'f1' }) },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsAdminService,
        ProductStocksService,
        {
          provide: SettingsService,
          useValue: { get: jest.fn().mockResolvedValue(20) },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = moduleRef.get(ProductsAdminService);
  });

  describe('buildProductSlug', () => {
    it('nomga o‘lcham qo‘shiladi', () => {
      expect(buildProductSlug('Lyuks Keramogranit', '60x60')).toBe(
        'lyuks-keramogranit-60x60',
      );
    });

    it('nomda o‘lcham bo‘lsa — ikki marta yozilmaydi', () => {
      expect(buildProductSlug('Lyuks 60x60', '60x60')).toBe('lyuks-60x60');
    });
  });

  describe('findAll', () => {
    it('isActive=false filtri ham ishlaydi (falsy qiymat tushib qolmaydi)', async () => {
      const query = Object.assign(new ProductAdminQueryDto(), {
        isActive: false,
      });
      await service.findAll(query);
      const arg = (
        prisma.product.findMany.mock.calls as [{ where: unknown }][]
      )[0][0];
      expect(arg.where).toEqual({ isActive: false });
    });

    it('🔒 select’da filial narxi YO‘Q', async () => {
      await service.findAll(new ProductAdminQueryDto());
      const arg = (
        prisma.product.findMany.mock.calls as [
          { select: Record<string, unknown> },
        ][]
      )[0][0];
      expect(arg.select.branchProducts).toBeUndefined();
    });

    it('muqova surati javobda bor (B-060)', async () => {
      const result = await service.findAll(new ProductAdminQueryDto());
      expect(result.items[0].coverUrl).toBe(
        '/uploads/products/lyuks-60x60-1.webp',
      );
    });

    it('surati yo‘q mahsulotda muqova `null` (B-060)', async () => {
      prisma.product.findMany.mockResolvedValueOnce([row({ media: [] })]);
      const result = await service.findAll(new ProductAdminQueryDto());
      expect(result.items[0].coverUrl).toBeNull();
    });

    it('muqova BITTA so‘rovda olinadi — N+1 yo‘q (B-060)', async () => {
      await service.findAll(new ProductAdminQueryDto());
      const arg = (
        prisma.product.findMany.mock.calls as [
          { select: { media?: { take?: number; where?: unknown } } },
        ][]
      )[0][0];
      // Ro'yxat uchun har qator bo'yicha alohida media so'rovi bo'lmasin
      expect(arg.select.media?.take).toBe(1);
      // 360° material muqova bo'lolmaydi
      expect(arg.select.media?.where).toEqual({ type: 'IMAGE' });
    });

    it('aniq zaxira soni va holati bor, Decimal satrga o‘giriladi', async () => {
      const result = await service.findAll(new ProductAdminQueryDto());
      expect(result.items[0]).toMatchObject({
        sqmPerPallet: '1.44',
        weightPerPallet: '32.5',
        stock: { stockPallets: 100, stockStatus: 'IN_STOCK' },
      });
    });
  });

  describe('create', () => {
    it('slug nom va o‘lchamdan yasaladi', async () => {
      await service.create(createDto);
      const arg = (
        prisma.product.create.mock.calls as [
          { data: Record<string, unknown> },
        ][]
      )[0][0];
      expect(arg.data.slug).toBe('lyuks-keramogranit-60x60');
    });

    it('o‘lcham yoki zavod yo‘q — 400, yaratilmaydi', async () => {
      prisma.productSize.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(createDto)).rejects.toThrow(
        'O‘lcham topilmadi',
      );

      prisma.factory.findUnique.mockResolvedValueOnce(null);
      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('nomdan URL yasab bo‘lmasa — 400', async () => {
      await expect(
        service.create({ ...createDto, name: '!!!' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('slug band — 409', async () => {
      prisma.product.create.mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );
      await expect(service.create(createDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('🆕 product.activated (B-040)', () => {
    it('faol yaratilsa — chiqariladi', async () => {
      await service.create(createDto);
      expect(events.emit).toHaveBeenCalledWith('product.activated', {
        productId: 'p1',
      });
    });

    it('bazadan nofaol qaytsa — chiqmaydi', async () => {
      prisma.product.create.mockResolvedValueOnce(row({ isActive: false }));
      await service.create(createDto);
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('update isActive: true — chiqariladi; boshqa maydon — yo‘q', async () => {
      await service.update('p1', { color: 'Oq' });
      expect(events.emit).not.toHaveBeenCalled();
      await service.update('p1', { isActive: true });
      expect(events.emit).toHaveBeenCalledTimes(1);
    });

    it('soft delete — chiqmaydi', async () => {
      await service.softDelete('p1');
      expect(events.emit).not.toHaveBeenCalled();
    });
  });

  describe('update / softDelete', () => {
    it('mahsulot yo‘q — 404', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('x', { name: 'A' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('yangi zavod mavjud emas — 400', async () => {
      prisma.factory.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.update('p1', { factoryId: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('soft delete — faqat isActive: false', async () => {
      await service.softDelete('p1');
      const arg = (
        prisma.product.update.mock.calls as [{ data: unknown }][]
      )[0][0];
      expect(arg.data).toEqual({ isActive: false });
    });
  });
});
