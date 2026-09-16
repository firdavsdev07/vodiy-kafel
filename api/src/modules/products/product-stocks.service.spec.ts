import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StockStatus } from '../../common/enums';
import { PrismaService } from '../../prisma';
import { SettingsService } from '../settings/settings.service';
import { ProductStockQueryDto } from './dto';
import { ProductStocksService } from './product-stocks.service';

/** B-021 · markaziy ombor zaxirasi. */
describe('ProductStocksService (B-021)', () => {
  let service: ProductStocksService;
  let settings: { get: jest.Mock };
  let prisma: {
    product: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock };
    productStock: { upsert: jest.Mock };
  };

  const product = { id: 'p1', name: 'Lyuks', slug: 'lyuks', isActive: true };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
      productStock: {
        upsert: jest.fn().mockResolvedValue({
          stockPallets: 5,
          lowStockThreshold: null,
          updatedAt: new Date('2026-01-01'),
        }),
      },
    };

    settings = { get: jest.fn().mockResolvedValue(20) };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ProductStocksService,
        { provide: SettingsService, useValue: settings },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(ProductStocksService);
  });

  describe('getGlobalLowThreshold', () => {
    it('keshlangan sozlamadan o‘qiydi (B-025)', async () => {
      settings.get.mockResolvedValueOnce(7);
      expect(await service.getGlobalLowThreshold()).toBe(7);
      expect(settings.get).toHaveBeenCalledWith('stock.lowThresholdPallets');
    });
  });

  describe('summarize', () => {
    it('zaxira yozuvi yo‘q — 0 va OUT_OF_STOCK ("noma‘lum" ≠ "bor")', () => {
      expect(service.summarize(null, 20)).toEqual({
        stockPallets: 0,
        lowStockThreshold: null,
        effectiveThreshold: 20,
        stockStatus: StockStatus.OUT_OF_STOCK,
      });
    });

    it('mahsulotning o‘z chegarasi global sozlamadan ustun', () => {
      const result = service.summarize(
        { stockPallets: 10, lowStockThreshold: 5 },
        20,
      );
      expect(result.effectiveThreshold).toBe(5);
      expect(result.stockStatus).toBe(StockStatus.IN_STOCK);
    });

    it('chegara 0 bo‘lsa ham global sozlamaga tushib ketmaydi', () => {
      const result = service.summarize(
        { stockPallets: 3, lowStockThreshold: 0 },
        20,
      );
      expect(result.effectiveThreshold).toBe(0);
      expect(result.stockStatus).toBe(StockStatus.IN_STOCK);
    });

    it('chegaraga teng — LOW', () => {
      expect(
        service.summarize({ stockPallets: 20, lowStockThreshold: null }, 20)
          .stockStatus,
      ).toBe(StockStatus.LOW);
    });
  });

  describe('findAll', () => {
    it('zaxirasi kiritilmagan mahsulot ham ro‘yxatda (updatedAt: null)', async () => {
      prisma.product.findMany.mockResolvedValueOnce([
        { ...product, stock: null },
      ]);
      const result = await service.findAll(new ProductStockQueryDto());
      expect(result.items[0]).toMatchObject({
        product,
        stockPallets: 0,
        stockStatus: StockStatus.OUT_OF_STOCK,
        updatedAt: null,
      });
    });
  });

  describe('upsert', () => {
    const upsertArg = () =>
      (
        prisma.productStock.upsert.mock.calls as [
          { create: Record<string, unknown>; update: Record<string, unknown> },
        ][]
      )[0][0];

    it('mahsulot yo‘q — 404', async () => {
      prisma.product.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.upsert({ productId: 'x', stockPallets: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.productStock.upsert).not.toHaveBeenCalled();
    });

    it('chegara yuborilmasa — mavjud chegaraga tegilmaydi', async () => {
      await service.upsert({ productId: 'p1', stockPallets: 5 });
      expect(upsertArg().update).toEqual({ stockPallets: 5 });
    });

    it('chegara null — global sozlamaga qaytariladi', async () => {
      await service.upsert({
        productId: 'p1',
        stockPallets: 5,
        lowStockThreshold: null,
      });
      expect(upsertArg().update).toEqual({
        stockPallets: 5,
        lowStockThreshold: null,
      });
    });
  });
});
