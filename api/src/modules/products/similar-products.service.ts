import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StockStatus } from '../../common/enums';
import { PrismaService, type ProductSurface } from '../../prisma';
import type { ProductListItemResponseDto, SimilarProductLinkDto } from './dto';
import { ProductStocksService } from './product-stocks.service';
import { ProductsService } from './products.service';

/**
 * Avtomatik tanlov uchun ko'rib chiqiladigan nomzodlar chegarasi. Bir xil
 * o'lcham va sirtdagi mahsulotlar soni odatda o'nlab — bu chegara faqat
 * katalog kattalashganda so'rovni cheklash uchun.
 */
const AUTO_CANDIDATE_CAP = 100;

/** Ochiq vitrinada ko'rinadigan va omborda BOR mahsulot. */
const AVAILABLE_VISIBLE = {
  isActive: true,
  factory: { isActive: true },
  stock: { is: { stockPallets: { gt: 0 } } },
} as const;

const normalizeColor = (color: string | null): string =>
  (color ?? '').trim().toLocaleLowerCase('uz');

/**
 * «Shunga o'xshash mahsulotlar» (B-023, TZ 3.1).
 *
 * Tanlov tartibi:
 *   1. Admin qo'lda bog'laganlari — DOIM, admin qo'ygan tartibda.
 *   2. Mahsulotning o'zi LOW yoki OUT_OF_STOCK bo'lsa — qolgan joy
 *      avtomatik to'ldiriladi: bir xil o'lcham + bir xil sirt, IN_STOCK;
 *      bir xil rangdagilar oldinda.
 *
 * ⚠ Mahsulot yetarli bo'lsa avtomatik tanlov ishlamaydi: TZ uni "mahsulot
 *   yo'q/kam bo'lsa" deb belgilaydi — aks holda mijoz bor mahsulotdan
 *   boshqasiga chalg'itilardi.
 *
 * 🔒 Javob — ochiq katalog kartasi: narx ham, zaxira soni ham yo'q.
 */
@Injectable()
export class SimilarProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsService,
    private readonly stocks: ProductStocksService,
  ) {}

  async findPublic(
    slug: string,
    limit: number,
  ): Promise<ProductListItemResponseDto[]> {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true, factory: { isActive: true } },
      select: {
        id: true,
        sizeId: true,
        surface: true,
        color: true,
        stock: { select: { stockPallets: true, lowStockThreshold: true } },
      },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    const manual = await this.prisma.productSimilar.findMany({
      where: { productId: product.id, similarProduct: AVAILABLE_VISIBLE },
      select: { similarProductId: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });
    const ids = manual.map((link) => link.similarProductId);

    if (ids.length < limit) {
      const globalThreshold = await this.stocks.getGlobalLowThreshold();
      const ownStatus = this.stocks.summarize(
        product.stock,
        globalThreshold,
      ).stockStatus;

      if (ownStatus !== StockStatus.IN_STOCK) {
        const auto = await this.pickAutomatic(
          product,
          ids,
          globalThreshold,
          limit - ids.length,
        );
        ids.push(...auto);
      }
    }

    return this.products.findListItemsByIds(ids);
  }

  async findLinks(productId: string): Promise<SimilarProductLinkDto[]> {
    await this.assertProductExists(productId);

    const links = await this.prisma.productSimilar.findMany({
      where: { productId },
      select: {
        sortOrder: true,
        similarProduct: {
          select: { id: true, name: true, slug: true, isActive: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return links.map((link) => ({
      product: link.similarProduct,
      sortOrder: link.sortOrder,
    }));
  }

  /**
   * Qo'lda bog'lanishlarni TO'LIQ almashtiradi (bitta tranzaksiyada).
   *
   * Bog'lanish yo'nalishli: A → B qo'yilsa, B → A o'zi paydo bo'lmaydi.
   */
  async setLinks(
    productId: string,
    similarProductIds: string[],
  ): Promise<SimilarProductLinkDto[]> {
    await this.assertProductExists(productId);

    if (similarProductIds.includes(productId)) {
      throw new BadRequestException(
        'Mahsulot o‘ziga o‘xshash sifatida bog‘lana olmaydi',
      );
    }

    const found = await this.prisma.product.findMany({
      where: { id: { in: similarProductIds } },
      select: { id: true },
    });
    const foundIds = new Set(found.map((item) => item.id));
    const missing = similarProductIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Mahsulot topilmadi: ${missing.join(', ')}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.productSimilar.deleteMany({ where: { productId } }),
      this.prisma.productSimilar.createMany({
        data: similarProductIds.map((similarProductId, index) => ({
          productId,
          similarProductId,
          sortOrder: index,
        })),
      }),
    ]);

    return this.findLinks(productId);
  }

  /**
   * IN_STOCK holatini bazada filtrlab bo'lmaydi: chegara har mahsulotda
   * o'zicha (`lowStockThreshold ?? global`). Shuning uchun bazadan faqat
   * "bor" nomzodlar olinadi, holat esa xotirada — admin panel bilan AYNAN
   * bir xil funksiya (`summarize`) orqali hisoblanadi.
   */
  private async pickAutomatic(
    product: {
      id: string;
      sizeId: string;
      surface: ProductSurface;
      color: string | null;
    },
    excludeIds: string[],
    globalThreshold: number,
    count: number,
  ): Promise<string[]> {
    const candidates = await this.prisma.product.findMany({
      where: {
        ...AVAILABLE_VISIBLE,
        id: { notIn: [product.id, ...excludeIds] },
        sizeId: product.sizeId,
        surface: product.surface,
      },
      select: {
        id: true,
        color: true,
        stock: { select: { stockPallets: true, lowStockThreshold: true } },
      },
      orderBy: [{ viewCount: 'desc' }, { id: 'asc' }],
      take: AUTO_CANDIDATE_CAP,
    });

    const color = normalizeColor(product.color);
    const inStock = candidates.filter(
      (candidate) =>
        this.stocks.summarize(candidate.stock, globalThreshold).stockStatus ===
        StockStatus.IN_STOCK,
    );
    const sameColor = inStock.filter(
      (candidate) => color && normalizeColor(candidate.color) === color,
    );
    const otherColor = inStock.filter(
      (candidate) => !sameColor.includes(candidate),
    );

    return [...sameColor, ...otherColor]
      .slice(0, count)
      .map((candidate) => candidate.id);
  }

  private async assertProductExists(productId: string): Promise<void> {
    const found = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Mahsulot topilmadi');
  }
}
