import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ProductSortField,
  PublicAvailability,
  SortOrder,
} from '../../common/enums';
import { Prisma, PrismaService } from '../../prisma';
import { ProductQueryDto } from './dto';
import { ProductsService } from './products.service';

/**
 * B-020 · ochiq katalog. Diqqat markazida — CLAUDE.md qoida 2 va G3:
 *   • NARX javobga chiqmasligi (va umuman so'ralmasligi)
 *   • zaxira ANIQ SONI chiqmasligi — faqat ikki holat
 *   • o'chirilgan zavod mahsulotlari vitrinada qolmasligi
 */
describe('ProductsService (B-020)', () => {
  let service: ProductsService;
  let findMany: jest.Mock;
  let findFirst: jest.Mock;
  let count: jest.Mock;

  const row = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    name: 'Lyuks Keramogranit',
    slug: 'lyuks-keramogranit-60x60',
    surface: 'POL',
    color: 'Bej',
    sqmPerPallet: new Prisma.Decimal('1.4400'),
    weightPerPallet: new Prisma.Decimal('1250.500'),
    factory: { id: 'f1', name: 'YONGXIN', slug: 'yongxin' },
    size: { id: 's1', label: '60x60', widthCm: 60, heightCm: 60 },
    stock: { stockPallets: 12 },
    media: [{ url: '/img/1.jpg' }],
    ...over,
  });

  const query = (over: Partial<ProductQueryDto> = {}): ProductQueryDto =>
    Object.assign(new ProductQueryDto(), {
      page: 1,
      limit: 20,
      sortOrder: SortOrder.DESC,
      ...over,
    });

  beforeEach(async () => {
    findMany = jest.fn().mockResolvedValue([]);
    findFirst = jest.fn();
    count = jest.fn().mockResolvedValue(0);

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: { product: { findMany, findFirst, count } },
        },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  const lastSelect = () =>
    (findMany.mock.calls as [{ select: Record<string, unknown> }][])[0][0]
      .select;
  const lastWhere = () =>
    (findMany.mock.calls as [{ where: Record<string, unknown> }][])[0][0].where;

  describe('🔒 maxfiylik', () => {
    it('NARX so‘ralmaydi ham — `branchProducts` select’da YO‘Q', async () => {
      await service.findAllPublic(query());

      // Eng muhim invariant: ma'lumot qo'lga kelmasa, sizib chiqolmaydi.
      expect(lastSelect().branchProducts).toBeUndefined();
    });

    it('javobda stockPallets va narx YO‘Q', async () => {
      findMany.mockResolvedValue([row()]);
      count.mockResolvedValue(1);

      const { items } = await service.findAllPublic(query());

      expect(items[0]).not.toHaveProperty('stockPallets');
      expect(items[0]).not.toHaveProperty('stock');
      expect(items[0]).not.toHaveProperty('pricePerSqm');
      expect(items[0]).not.toHaveProperty('branchProducts');
      // Faqat ikki holatli bayroq qoladi.
      expect(items[0].availability).toBe(PublicAvailability.AVAILABLE);
    });

    it('ichki maydonlar (isActive, viewCount) javobga chiqmaydi', async () => {
      findMany.mockResolvedValue([row()]);
      count.mockResolvedValue(1);

      const { items } = await service.findAllPublic(query());

      expect(items[0]).not.toHaveProperty('isActive');
      expect(items[0]).not.toHaveProperty('viewCount');
    });
  });

  describe('availability', () => {
    it.each([
      [{ stockPallets: 12 }, PublicAvailability.AVAILABLE],
      [{ stockPallets: 1 }, PublicAvailability.AVAILABLE],
      [{ stockPallets: 0 }, PublicAvailability.UNAVAILABLE],
    ])('zaxira %j → %s', async (stock, expected) => {
      findMany.mockResolvedValue([row({ stock })]);
      count.mockResolvedValue(1);

      const { items } = await service.findAllPublic(query());

      expect(items[0].availability).toBe(expected);
    });

    it('🔒 zaxira yozuvi umuman bo‘lmasa → UNAVAILABLE', async () => {
      // "Noma'lum" ni "bor" deb ko'rsatish yo'q mahsulotni sotishga
      // olib kelardi.
      findMany.mockResolvedValue([row({ stock: null })]);
      count.mockResolvedValue(1);

      const { items } = await service.findAllPublic(query());

      expect(items[0].availability).toBe(PublicAvailability.UNAVAILABLE);
    });
  });

  describe('ko‘rinish shartlari', () => {
    it('🔒 faqat faol mahsulot va faol ZAVOD', async () => {
      await service.findAllPublic(query());

      expect(lastWhere()).toMatchObject({
        isActive: true,
        factory: { isActive: true },
      });
    });
  });

  describe('filtrlar', () => {
    it('zavod, o‘lcham va sirt filtri qo‘llanadi', async () => {
      await service.findAllPublic(
        query({ factoryId: 'f1', sizeId: 's1', surface: 'DEVOR' }),
      );

      expect(lastWhere()).toMatchObject({
        factoryId: 'f1',
        sizeId: 's1',
        surface: 'DEVOR',
      });
    });

    it('filtr berilmasa `where` ga tushmaydi (undefined bilan ifloslanmaydi)', async () => {
      await service.findAllPublic(query());

      expect(lastWhere()).not.toHaveProperty('factoryId');
      expect(lastWhere()).not.toHaveProperty('surface');
    });

    it('qidiruv nom VA zavod nomi bo‘yicha, katta-kichik harfsiz', async () => {
      await service.findAllPublic(query({ search: 'yongxin' }));

      expect(lastWhere().OR).toEqual([
        { name: { contains: 'yongxin', mode: 'insensitive' } },
        { factory: { name: { contains: 'yongxin', mode: 'insensitive' } } },
      ]);
    });
  });

  describe('saralash va sahifalash', () => {
    it('sukut bo‘yicha — yangi mahsulot oldinda', async () => {
      await service.findAllPublic(query());

      const arg = (findMany.mock.calls as [{ orderBy: unknown[] }][])[0][0];
      expect(arg.orderBy[0]).toEqual({ createdAt: 'desc' });
    });

    it('🔒 tartib BARQAROR — ikkinchi mezon sifatida id qo‘shiladi', async () => {
      // Busiz teng qiymatli qatorlar sahifalar orasida sakrab, bir
      // mahsulot ikki marta chiqib, boshqasi umuman tushmay qolardi.
      await service.findAllPublic(
        query({ sortBy: ProductSortField.NAME, sortOrder: SortOrder.ASC }),
      );

      const arg = (findMany.mock.calls as [{ orderBy: unknown[] }][])[0][0];
      expect(arg.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    });

    it('skip/take sahifadan hisoblanadi', async () => {
      await service.findAllPublic(query({ page: 3, limit: 10 }));

      const arg = (
        findMany.mock.calls as [{ skip: number; take: number }][]
      )[0][0];
      expect(arg).toMatchObject({ skip: 20, take: 10 });
    });

    it('sahifalash meta’si to‘g‘ri hisoblanadi', async () => {
      findMany.mockResolvedValue([row()]);
      count.mockResolvedValue(45);

      const result = await service.findAllPublic(query({ page: 2, limit: 20 }));

      expect(result).toMatchObject({
        total: 45,
        page: 2,
        limit: 20,
        totalPages: 3,
      });
    });
  });

  describe('Decimal', () => {
    it('o‘nlik qiymatlar SATR bo‘lib chiqadi (aniqlik yo‘qolmasin)', async () => {
      findMany.mockResolvedValue([row()]);
      count.mockResolvedValue(1);

      const { items } = await service.findAllPublic(query());

      expect(typeof items[0].sqmPerPallet).toBe('string');
      expect(items[0].sqmPerPallet).toBe('1.44');
      expect(items[0].weightPerPallet).toBe('1250.5');
    });
  });

  describe('findOneBySlug', () => {
    it('media va tavsif bilan qaytaradi', async () => {
      findFirst.mockResolvedValue({
        ...row(),
        description: 'Tavsif',
        media: [
          { id: 'm1', url: '/img/1.jpg', type: 'IMAGE' },
          { id: 'm2', url: '/img/360.mp4', type: 'VIDEO_360' },
        ],
      });

      const dto = await service.findOneBySlug('lyuks-keramogranit-60x60');

      expect(dto.description).toBe('Tavsif');
      expect(dto.media).toHaveLength(2);
      // Kartadagi surat — birinchi IMAGE, 360° video emas.
      expect(dto.primaryImageUrl).toBe('/img/1.jpg');
      expect(dto).not.toHaveProperty('stockPallets');
    });

    it('faqat suratsiz (360° video) mahsulotda primaryImageUrl null', async () => {
      findFirst.mockResolvedValue({
        ...row(),
        description: null,
        media: [{ id: 'm1', url: '/img/360.mp4', type: 'VIDEO_360' }],
      });

      const dto = await service.findOneBySlug('x');

      expect(dto.primaryImageUrl).toBeNull();
    });

    it('topilmasa → 404', async () => {
      findFirst.mockResolvedValue(null);

      await expect(service.findOneBySlug('yo-q')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('🔒 so‘rov faol mahsulot va faol zavod bilan cheklanadi', async () => {
      findFirst.mockResolvedValue(null);

      await service.findOneBySlug('x').catch(() => undefined);

      const arg = (
        findFirst.mock.calls as [{ where: Record<string, unknown> }][]
      )[0][0];
      expect(arg.where).toMatchObject({
        slug: 'x',
        isActive: true,
        factory: { isActive: true },
      });
    });
  });
});
