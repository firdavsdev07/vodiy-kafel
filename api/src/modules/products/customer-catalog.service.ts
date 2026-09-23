import { Injectable, NotFoundException } from '@nestjs/common';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { ProductSortField, SortOrder } from '../../common/enums';
import { toStockStatus } from '../../common/utils/stock-status.util';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { QuoteService } from '../calculator/quote.service';
import { PricingResolverService } from '../pricing/pricing-resolver.service';
import { PricingRulesService } from '../pricing/pricing-rules.service';
import type { CustomerPricingRules } from '../pricing/pricing-rules.service';
import { ProductStocksService } from './product-stocks.service';
import type {
  CustomerCatalogDetailDto,
  CustomerCatalogItemDto,
  ProductQueryDto,
} from './dto';

/**
 * Kabinet katalogi uchun tanlanadigan maydonlar.
 *
 * ⚠ Ochiq katalogdan (`products.service.ts`) FARQI ataylab ko'rinib turadi:
 *   bu yerda `branchProducts` ham, `stock.lowStockThreshold` ham so'raladi —
 *   narx va uch darajali holat shulardan hisoblanadi. Ochiq katalog esa
 *   ularni umuman so'ramaydi, shuning uchun narx u yerga sizib chiqa olmaydi.
 *
 * `branchProducts` FILTRLANGAN holda so'raladi (faqat mijoz filiali) —
 * boshqa filial narxi qo'lga ham kelmaydi.
 */
const catalogSelect = (branchId: string) =>
  ({
    id: true,
    name: true,
    slug: true,
    surface: true,
    color: true,
    factoryId: true,
    sqmPerPallet: true,
    weightPerPallet: true,
    factory: { select: { id: true, name: true, slug: true } },
    size: { select: { id: true, label: true, widthCm: true, heightCm: true } },
    category: { select: { id: true, name: true, slug: true } },
    stock: { select: { stockPallets: true, lowStockThreshold: true } },
    branchProducts: {
      where: { branchId, isActive: true },
      select: { pricePerSqm: true },
      take: 1,
    },
  }) as const;

/** Kartadagi birinchi surat — 360° materiallar bu yerga tushmaydi. */
const PRIMARY_IMAGE = {
  where: { type: 'IMAGE' },
  orderBy: { sortOrder: 'asc' },
  take: 1,
  select: { url: true },
} as const;

const MEDIA_LIST = {
  orderBy: { sortOrder: 'asc' },
  select: { id: true, url: true, type: true },
} as const;

type CatalogRow = Prisma.ProductGetPayload<{
  select: ReturnType<typeof catalogSelect> & { media: typeof PRIMARY_IMAGE };
}>;
type DetailRow = Prisma.ProductGetPayload<{
  select: ReturnType<typeof catalogSelect> & {
    description: true;
    media: typeof MEDIA_LIST;
  };
}>;

/**
 * Optom mijoz kabinetining katalogi (B-064, TZ 3.7.1).
 *
 * ⚠ NEGA ALOHIDA ENDPOINT: `GET /products` ni "auth bo'lsa narx qo'sh"
 *   qilib o'zgartirish bitta xato bilan narxni OCHIQ javobga chiqarib
 *   qo'yardi. Ikki endpoint, ikki select — narx faqat shu yerda so'raladi.
 *
 * 🔒 Filial TOKENDAN (CLAUDE.md qoida 5) — so'rovda `branchId` yo'q va
 *    qabul qilinmaydi. `QuoteService.requireCustomer` tokendagi filialni
 *    bazadagi bilan solishtiradi (mijoz boshqa filialga o'tkazilgan bo'lsa
 *    401) — kalkulyator va buyurtma bilan AYNAN bir xil tekshiruv.
 *
 * 🔒 Narx `PricingResolverService` orqali — kalkulyator ishlatadigan O'SHA
 *    zanjir (B-054). Ikkinchi nusxa yozilmaydi: aks holda katalogdagi narx
 *    bilan savatdagi narx vaqt o'tib bir-biridan uzoqlashardi.
 */
@Injectable()
export class CustomerCatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quote: QuoteService,
    private readonly pricingRules: PricingRulesService,
    private readonly pricingResolver: PricingResolverService,
    private readonly stocks: ProductStocksService,
  ) {}

  async findAll(
    actor: Actor | undefined,
    query: ProductQueryDto,
  ): Promise<PaginatedResult<CustomerCatalogItemDto>> {
    const { branchId, customerId } = await this.context(actor);
    const where = this.buildWhere(branchId, query);

    const [total, rows, rules, globalThreshold] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: { ...catalogSelect(branchId), media: PRIMARY_IMAGE },
        orderBy: this.buildOrderBy(query),
        skip: query.skip,
        take: query.take,
      }),
      this.pricingRules.findForCustomer(customerId),
      this.stocks.getGlobalLowThreshold(),
    ]);

    return paginate(
      rows.map((row) => this.toItem(row, rules, globalThreshold)),
      total,
      query,
    );
  }

  /**
   * Mahsulot sahifasi — slug bo'yicha.
   *
   * 🔒 Filialda sotilmaydigan mahsulot uchun 404 (403 emas): mijoz boshqa
   *    filialda nima borligini bilib olmasligi kerak.
   */
  async findOneBySlug(
    actor: Actor | undefined,
    slug: string,
  ): Promise<CustomerCatalogDetailDto> {
    const { branchId, customerId } = await this.context(actor);

    const [row, rules, globalThreshold] = await Promise.all([
      this.prisma.product.findFirst({
        where: { slug, ...this.visibilityWhere(branchId) },
        select: {
          ...catalogSelect(branchId),
          description: true,
          media: MEDIA_LIST,
        },
      }),
      this.pricingRules.findForCustomer(customerId),
      this.stocks.getGlobalLowThreshold(),
    ]);

    if (!row) throw new NotFoundException('Mahsulot topilmadi');

    const media = row.media.map((item) => ({
      id: item.id,
      url: item.url,
      type: item.type,
    }));

    return {
      ...this.toItem({ ...row, media: [] }, rules, globalThreshold),
      primaryImageUrl:
        row.media.find((item) => item.type === 'IMAGE')?.url ?? null,
      description: row.description,
      media,
    };
  }

  // — Ichki —

  private context(actor: Actor | undefined) {
    return this.quote.requireCustomer(actor);
  }

  /**
   * Kabinet katalogida nima ko'rinadi.
   *
   * Ochiq katalogning shartlari (mahsulot faol + zavodi faol) USTIGA
   * yana bittasi: mahsulot MIJOZ FILIALIDA sotilishi kerak
   * (`BranchProduct` faol). Narxi yo'q mahsulotni ko'rsatish "narxini
   * so'rab ko'ring" degan holatga olib kelardi — TZ bunday holatni
   * ko'zlamaydi.
   */
  private visibilityWhere(branchId: string): Prisma.ProductWhereInput {
    return {
      isActive: true,
      factory: { isActive: true },
      branchProducts: { some: { branchId, isActive: true } },
    };
  }

  private buildWhere(
    branchId: string,
    query: ProductQueryDto,
  ): Prisma.ProductWhereInput {
    const { factoryId, sizeId, categoryId, surface, search } = query;

    return {
      ...this.visibilityWhere(branchId),
      ...(factoryId && { factoryId }),
      ...(sizeId && { sizeId }),
      ...(categoryId && { categoryId }),
      ...(surface && { surface }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { factory: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };
  }

  /**
   * Saralash — ochiq katalog bilan bir xil maydonlar.
   *
   * ⚠ NARX BO'YICHA SARALASH YO'Q: yakuniy narx bazada emas, har mijoz
   *   uchun zanjirdan HISOBLANADI. `ORDER BY` uni ko'rmaydi, bir sahifani
   *   saralash esa yolg'on tartib berardi (2-sahifada arzonroq mahsulot
   *   chiqib qolardi).
   */
  private buildOrderBy(
    query: ProductQueryDto,
  ): Prisma.ProductOrderByWithRelationInput[] {
    const field = query.sortBy ?? ProductSortField.CREATED_AT;
    const direction =
      query.sortOrder === SortOrder.ASC
        ? Prisma.SortOrder.asc
        : Prisma.SortOrder.desc;

    return [{ [field]: direction }, { id: Prisma.SortOrder.asc }];
  }

  /**
   * Prisma qatori → kabinet kartasi.
   *
   * 🔒 Maydonlar QO'LDA ko'chiriladi: `stockPallets`, `lowStockThreshold`
   *    va bazaviy narx javobga tasodifan tushib qolmasligi shu yerda
   *    ko'rinib turishi kerak.
   */
  private toItem(
    row: CatalogRow | (DetailRow & { media: [] }),
    rules: CustomerPricingRules,
    globalThreshold: number,
  ): CustomerCatalogItemDto {
    // `visibilityWhere` faol `BranchProduct` ni talab qiladi — qator bor.
    const basePrice = row.branchProducts[0].pricePerSqm;
    const { finalPrice } = this.pricingResolver.resolve(
      rules.product,
      {
        domain: 'PRODUCT',
        productId: row.id,
        factoryId: row.factoryId,
      },
      basePrice,
    );

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      factory: row.factory,
      size: row.size,
      category: row.category,
      surface: row.surface,
      color: row.color,
      sqmPerPallet: row.sqmPerPallet.toString(),
      weightPerPallet: row.weightPerPallet.toString(),
      primaryImageUrl: row.media[0]?.url ?? null,
      pricePerSqm: finalPrice.toString(),
      stockStatus: toStockStatus(
        row.stock?.stockPallets,
        row.stock?.lowStockThreshold ?? globalThreshold,
      ),
    };
  }
}
