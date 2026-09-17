import { NotFoundException } from '@nestjs/common';
import type { Actor } from '../../common/types/actor';
import type { PrismaService } from '../../prisma';
import type { QuoteService } from '../calculator/quote.service';
import type { PricingResolverService } from '../pricing/pricing-resolver.service';
import type { PricingRulesService } from '../pricing/pricing-rules.service';
import { CustomerCatalogService } from './customer-catalog.service';
import type { ProductStocksService } from './product-stocks.service';

/**
 * B-064 · optom mijoz katalogi.
 *
 * ⚠ `PricingResolverService` bu yerda STUB: narx zanjirining o'zi
 *   `pricing-resolver.service.spec.ts` da tekshirilgan. Bu yerda muhimi —
 *   katalog aynan o'sha servisdan o'tishi va javobga faqat YAKUNIY narx
 *   chiqishi.
 */
describe('CustomerCatalogService', () => {
  let service: CustomerCatalogService;
  let product: { count: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock };
  let resolve: jest.Mock;

  const actor: Actor = {
    id: 'c1',
    type: 'CUSTOMER',
    role: null,
    branchId: 'fargona',
  } as unknown as Actor;

  const row = {
    id: 'p1',
    name: 'Lyuks',
    slug: 'lyuks',
    surface: 'POL',
    color: 'Bej',
    factoryId: 'f1',
    sqmPerPallet: { toString: () => '1.44' },
    weightPerPallet: { toString: () => '1250' },
    factory: { id: 'f1', name: 'YONGXIN', slug: 'yongxin' },
    size: { id: 's1', label: '60x60', widthCm: 60, heightCm: 60 },
    stock: { stockPallets: 5, lowStockThreshold: 10 },
    branchProducts: [{ pricePerSqm: '100000.00' }],
    media: [{ url: '/uploads/a.jpg' }],
  };

  const query = { page: 1, limit: 20, skip: 0, take: 20 } as never;

  beforeEach(() => {
    product = {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([row]),
      findFirst: jest.fn().mockResolvedValue({
        ...row,
        description: 'Tavsif',
        media: [
          { id: 'm1', url: '/uploads/a.jpg', type: 'IMAGE' },
          { id: 'm2', url: '/uploads/b.mp4', type: 'VIDEO_360' },
        ],
      }),
    };
    resolve = jest.fn().mockReturnValue({
      finalPrice: { toString: () => '85000.00' },
      ruleId: 'r1',
    });

    service = new CustomerCatalogService(
      { product } as unknown as PrismaService,
      {
        requireCustomer: jest
          .fn()
          .mockResolvedValue({ customerId: 'c1', branchId: 'fargona' }),
      } as unknown as QuoteService,
      {
        findForCustomer: jest
          .fn()
          .mockResolvedValue({ product: [{ id: 'r1' }], transport: [] }),
      } as unknown as PricingRulesService,
      { resolve } as unknown as PricingResolverService,
      {
        getGlobalLowThreshold: jest.fn().mockResolvedValue(20),
      } as unknown as ProductStocksService,
    );
  });

  it('🔒 faqat mijoz filialida sotiladigan mahsulot; narx zanjiridan o‘tadi', async () => {
    const result = await service.findAll(actor, query);

    const [{ where, select }] = product.findMany.mock.calls[0] as [
      { where: Record<string, unknown>; select: Record<string, unknown> },
    ];
    expect(where).toMatchObject({
      isActive: true,
      factory: { isActive: true },
      branchProducts: { some: { branchId: 'fargona', isActive: true } },
    });
    // Narx faqat MIJOZ filialidan so'raladi — boshqasi qo'lga ham kelmaydi
    expect(select.branchProducts).toMatchObject({
      where: { branchId: 'fargona', isActive: true },
    });
    expect(resolve).toHaveBeenCalledWith(
      [{ id: 'r1' }],
      { domain: 'PRODUCT', productId: 'p1', factoryId: 'f1' },
      '100000.00',
    );
    expect(result.items[0]).toMatchObject({
      pricePerSqm: '85000.00',
      // 5 paddon, chegara 10 → «kam qoldi»
      stockStatus: 'LOW',
    });
  });

  it('🔒 javobda zaxira soni, bazaviy narx va chegirma sababi YO‘Q', async () => {
    const { items } = await service.findAll(actor, query);
    const item = items[0] as unknown as Record<string, unknown>;

    expect(item).not.toHaveProperty('stockPallets');
    expect(item).not.toHaveProperty('lowStockThreshold');
    expect(item).not.toHaveProperty('branchProducts');
    expect(item).not.toHaveProperty('ruleId');
    expect(item).not.toHaveProperty('basePricePerSqm');
    expect(item).not.toHaveProperty('availability');
    expect(item).not.toHaveProperty('factoryId');
  });

  it('mahsulotning o‘z chegarasi bo‘lmasa — global sozlama', async () => {
    product.findMany.mockResolvedValueOnce([
      { ...row, stock: { stockPallets: 15, lowStockThreshold: null } },
    ]);
    const { items } = await service.findAll(actor, query);
    // 15 ≤ 20 (global) → LOW
    expect(items[0]?.stockStatus).toBe('LOW');
  });

  it('zaxira yozuvi yo‘q — OUT_OF_STOCK (noma‘lum «bor» emas)', async () => {
    product.findMany.mockResolvedValueOnce([{ ...row, stock: null }]);
    const { items } = await service.findAll(actor, query);
    expect(items[0]?.stockStatus).toBe('OUT_OF_STOCK');
  });

  it('mahsulot sahifasi: tavsif + butun media, birinchi surat kartada', async () => {
    const detail = await service.findOneBySlug(actor, 'lyuks');
    expect(detail).toMatchObject({
      description: 'Tavsif',
      primaryImageUrl: '/uploads/a.jpg',
      pricePerSqm: '85000.00',
    });
    expect(detail.media).toHaveLength(2);
  });

  it('🔒 filialda sotilmaydigan mahsulot — 404', async () => {
    product.findFirst.mockResolvedValueOnce(null);
    await expect(service.findOneBySlug(actor, 'yo-q')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
