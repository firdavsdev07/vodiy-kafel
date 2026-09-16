import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma';
import { SettingsService } from '../settings/settings.service';
import { ProductStocksService } from './product-stocks.service';
import { ProductsService } from './products.service';
import { SimilarProductsService } from './similar-products.service';

/** B-023 · o'xshash mahsulotlar. Global chegara — 20 paddon. */
describe('SimilarProductsService (B-023)', () => {
  let service: SimilarProductsService;
  let prisma: {
    product: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    productSimilar: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };
  let products: { findListItemsByIds: jest.Mock };

  const target = (
    stockPallets: number | null,
    color: string | null = 'Bej',
  ) => ({
    id: 'p0',
    sizeId: 's1',
    surface: 'POL',
    color,
    stock:
      stockPallets === null ? null : { stockPallets, lowStockThreshold: null },
  });

  const candidate = (
    id: string,
    stockPallets: number,
    color: string | null = 'Oq',
    lowStockThreshold: number | null = null,
  ) => ({ id, color, stock: { stockPallets, lowStockThreshold } });

  beforeEach(async () => {
    prisma = {
      product: {
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'p0' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      productSimilar: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockReturnValue('delete-op'),
        createMany: jest.fn().mockReturnValue('create-op'),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    products = {
      findListItemsByIds: jest
        .fn()
        .mockImplementation((ids: string[]) =>
          Promise.resolve(ids.map((id) => ({ id }))),
        ),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        SimilarProductsService,
        ProductStocksService,
        {
          provide: SettingsService,
          useValue: { get: jest.fn().mockResolvedValue(20) },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: ProductsService, useValue: products },
      ],
    }).compile();

    service = moduleRef.get(SimilarProductsService);
  });

  const resultIds = () =>
    (products.findListItemsByIds.mock.calls as [string[]][])[0][0];

  describe('findPublic', () => {
    it('ko‘rinmaydigan mahsulot — 404', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(null);
      await expect(service.findPublic('x', 8)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('mahsulot YETARLI — faqat qo‘lda bog‘langanlar, avtomatik tanlov yo‘q', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(target(100));
      prisma.productSimilar.findMany.mockResolvedValueOnce([
        { similarProductId: 'm1' },
      ]);

      await service.findPublic('x', 8);

      expect(resultIds()).toEqual(['m1']);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('qo‘lda bog‘langanlar faqat ko‘rinadigan va omborda BORlari', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(target(100));
      await service.findPublic('x', 8);

      const arg = (
        prisma.productSimilar.findMany.mock.calls as [
          { where: Record<string, unknown>; take: number },
        ][]
      )[0][0];
      expect(arg.where).toEqual({
        productId: 'p0',
        similarProduct: {
          isActive: true,
          factory: { isActive: true },
          stock: { is: { stockPallets: { gt: 0 } } },
        },
      });
      expect(arg.take).toBe(8);
    });

    it.each([
      ['LOW', 5],
      ['OUT_OF_STOCK', 0],
      ['zaxira yozuvi yo‘q', null],
    ])(
      'mahsulot %s — qo‘lda bog‘langanlardan keyin avtomatik to‘ldiriladi',
      async (_label, stock) => {
        prisma.product.findFirst.mockResolvedValueOnce(target(stock));
        prisma.productSimilar.findMany.mockResolvedValueOnce([
          { similarProductId: 'm1' },
        ]);
        prisma.product.findMany.mockResolvedValueOnce([
          candidate('a1', 50),
          candidate('a2', 60),
        ]);

        await service.findPublic('x', 8);

        expect(resultIds()).toEqual(['m1', 'a1', 'a2']);
        const arg = (
          prisma.product.findMany.mock.calls as [
            { where: Record<string, unknown> },
          ][]
        )[0][0];
        expect(arg.where).toMatchObject({
          id: { notIn: ['p0', 'm1'] },
          sizeId: 's1',
          surface: 'POL',
          isActive: true,
        });
      },
    );

    it('avtomatik: faqat IN_STOCK (mahsulotning o‘z chegarasi hisobga olinadi)', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(target(0));
      prisma.product.findMany.mockResolvedValueOnce([
        candidate('low-global', 20), // 20 ≤ 20 → LOW
        candidate('low-own', 30, 'Oq', 40), // 30 ≤ 40 → LOW
        candidate('ok-own', 10, 'Oq', 5), // 10 > 5 → IN_STOCK
        candidate('ok', 21), // 21 > 20 → IN_STOCK
      ]);

      await service.findPublic('x', 8);

      expect(resultIds()).toEqual(['ok-own', 'ok']);
    });

    it('avtomatik: bir xil rang oldinda (katta-kichik harf va bo‘sh joy farqsiz)', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(target(0, 'Bej'));
      prisma.product.findMany.mockResolvedValueOnce([
        candidate('oq', 50, 'Oq'),
        candidate('bej', 50, ' bej '),
        candidate('rangsiz', 50, null),
      ]);

      await service.findPublic('x', 8);

      expect(resultIds()).toEqual(['bej', 'oq', 'rangsiz']);
    });

    it('mahsulotda rang yo‘q — rangsizlar "bir xil rang" deb hisoblanmaydi', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(target(0, null));
      prisma.product.findMany.mockResolvedValueOnce([
        candidate('oq', 50, 'Oq'),
        candidate('rangsiz', 50, null),
      ]);

      await service.findPublic('x', 8);

      expect(resultIds()).toEqual(['oq', 'rangsiz']);
    });

    it('limit: qo‘lda + avtomatik jami limitdan oshmaydi', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(target(0));
      prisma.productSimilar.findMany.mockResolvedValueOnce([
        { similarProductId: 'm1' },
      ]);
      prisma.product.findMany.mockResolvedValueOnce([
        candidate('a1', 50),
        candidate('a2', 50),
        candidate('a3', 50),
      ]);

      await service.findPublic('x', 3);

      expect(resultIds()).toEqual(['m1', 'a1', 'a2']);
    });

    it('qo‘lda bog‘langanlar limitni to‘ldirsa — avtomatik so‘rov yo‘q', async () => {
      prisma.product.findFirst.mockResolvedValueOnce(target(0));
      prisma.productSimilar.findMany.mockResolvedValueOnce([
        { similarProductId: 'm1' },
        { similarProductId: 'm2' },
      ]);

      await service.findPublic('x', 2);

      expect(resultIds()).toEqual(['m1', 'm2']);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });
  });

  describe('setLinks', () => {
    it('ro‘yxatni to‘liq almashtiradi — tartib massiv bo‘yicha, bitta tranzaksiyada', async () => {
      prisma.product.findMany.mockResolvedValueOnce([{ id: 'b' }, { id: 'a' }]);

      await service.setLinks('p0', ['a', 'b']);

      expect(prisma.productSimilar.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'p0' },
      });
      expect(prisma.productSimilar.createMany).toHaveBeenCalledWith({
        data: [
          { productId: 'p0', similarProductId: 'a', sortOrder: 0 },
          { productId: 'p0', similarProductId: 'b', sortOrder: 1 },
        ],
      });
      expect(prisma.$transaction).toHaveBeenCalledWith([
        'delete-op',
        'create-op',
      ]);
    });

    it('bo‘sh ro‘yxat — hammasi olib tashlanadi', async () => {
      await service.setLinks('p0', []);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('o‘ziga bog‘lash — 400', async () => {
      await expect(service.setLinks('p0', ['p0'])).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('topilmagan ID — 400 va qaysi ekani aytiladi, hech narsa o‘zgarmaydi', async () => {
      prisma.product.findMany.mockResolvedValueOnce([{ id: 'a' }]);
      await expect(service.setLinks('p0', ['a', 'yoq'])).rejects.toThrow('yoq');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('mahsulot yo‘q — 404', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);
      await expect(service.setLinks('x', [])).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
