import { Injectable, NotFoundException } from '@nestjs/common';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import {
  ProductSortField,
  PublicAvailability,
  SortOrder,
} from '../../common/enums';
import { Prisma, PrismaService } from '../../prisma';
import type {
  ProductDetailResponseDto,
  ProductListItemResponseDto,
  ProductQueryDto,
} from './dto';

/**
 * Ochiq katalog uchun tanlanadigan maydonlar.
 *
 * 🔒 `branchProducts` BU YERDA YO'Q va bo'lmaydi — narx o'sha jadvalda
 *    (B-008). Uni umuman so'ramaslik narxning ochiq javobga sizib
 *    chiqishini TUZILMA darajasida imkonsiz qiladi: mapper'da bir maydonni
 *    unutish yetarli emas, chunki ma'lumot qo'lga ham kelmaydi.
 *
 * `stock.stockPallets` esa so'raladi — lekin faqat `availability` ni
 * HISOBLASH uchun; javobga hech qachon chiqmaydi (`toListItem` ga qara).
 */
const LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  surface: true,
  color: true,
  sqmPerPallet: true,
  weightPerPallet: true,
  factory: { select: { id: true, name: true, slug: true } },
  size: { select: { id: true, label: true, widthCm: true, heightCm: true } },
  stock: { select: { stockPallets: true } },
} as const;

/** Kartadagi birinchi surat — 360° materiallar bu yerga tushmaydi. */
const PRIMARY_IMAGE = {
  where: { type: 'IMAGE' },
  orderBy: { sortOrder: 'asc' },
  take: 1,
  select: { url: true },
} as const;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  description: true,
  media: {
    orderBy: { sortOrder: 'asc' },
    select: { id: true, url: true, type: true },
  },
} as const;

type ListRow = Prisma.ProductGetPayload<{
  select: typeof LIST_SELECT & { media: typeof PRIMARY_IMAGE };
}>;
type DetailRow = Prisma.ProductGetPayload<{ select: typeof DETAIL_SELECT }>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ochiq katalog ro'yxati (TZ 3.8).
   *
   * ⚠ Filial konteksti YO'Q: narx ko'rsatilmagani uchun `BranchScopeService`
   *   (B-051) bu yerda qo'llanmaydi. Mahsulotning o'zi hamma filialda bir xil.
   */
  async findAllPublic(
    query: ProductQueryDto,
  ): Promise<PaginatedResult<ProductListItemResponseDto>> {
    const where = this.buildPublicWhere(query);

    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: { ...LIST_SELECT, media: PRIMARY_IMAGE },
        orderBy: this.buildOrderBy(query),
        skip: query.skip,
        take: query.take,
      }),
    ]);

    return paginate(
      rows.map((row) => this.toListItem(row)),
      total,
      query,
    );
  }

  /** Mahsulot sahifasi — slug bo'yicha. */
  async findOneBySlug(slug: string): Promise<ProductDetailResponseDto> {
    const row = await this.prisma.product.findFirst({
      // `findUnique` emas: slug unique bo'lsa ham, mahsulot FAOL va zavodi
      // ham faol bo'lishi shart — bu qo'shimcha shartlar bilan `findUnique`
      // ishlamaydi.
      where: { slug, ...this.visibilityWhere() },
      select: DETAIL_SELECT,
    });

    if (!row) throw new NotFoundException('Mahsulot topilmadi');

    return {
      ...this.toListItem({ ...row, media: [] }),
      // Karta uchun birinchi surat — to'liq ro'yxatdan olinadi.
      primaryImageUrl:
        row.media.find((item) => item.type === 'IMAGE')?.url ?? null,
      description: row.description,
      media: row.media.map((item) => ({
        id: item.id,
        url: item.url,
        type: item.type,
      })),
    };
  }

  /**
   * Berilgan ID lar bo'yicha ochiq kartalar — AYNAN shu tartibda.
   *
   * Ko'rinmaydigan (o'chirilgan yoki zavodi o'chirilgan) mahsulotlar jimgina
   * tushib qoladi: tanlovni boshqa servis qilgan bo'lsa ham, vitrina qoidasi
   * shu yerda qayta qo'llanadi.
   */
  async findListItemsByIds(
    ids: string[],
  ): Promise<ProductListItemResponseDto[]> {
    if (ids.length === 0) return [];

    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids }, ...this.visibilityWhere() },
      select: { ...LIST_SELECT, media: PRIMARY_IMAGE },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));

    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [this.toListItem(row)] : [];
    });
  }

  /**
   * Ochiq katalogda nima ko'rinadi.
   *
   * Mahsulotning o'zi faol bo'lishi YETARLI EMAS — zavodi ham faol bo'lishi
   * kerak. Aks holda admin zavodni o'chirgach (B-018 soft delete) uning
   * mahsulotlari vitrinada qolib ketardi.
   */
  private visibilityWhere(): Prisma.ProductWhereInput {
    return { isActive: true, factory: { isActive: true } };
  }

  private buildPublicWhere(query: ProductQueryDto): Prisma.ProductWhereInput {
    const { factoryId, sizeId, surface, search } = query;

    return {
      ...this.visibilityWhere(),
      ...(factoryId && { factoryId }),
      ...(sizeId && { sizeId }),
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
   * Saralash tartibi.
   *
   * ⚠ Ikkinchi mezon (`id`) MAJBURIY: `createdAt` yoki `name` teng bo'lgan
   *   qatorlar tartibi Postgres ixtiyorida qoladi va sahifalashda bir
   *   mahsulot ikki sahifada chiqib, boshqasi umuman tushmay qolishi mumkin.
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
   * Prisma qatori → ochiq javob.
   *
   * 🔒 Maydonlar QO'LDA ko'chiriladi (spread emas): `stockPallets` javobga
   *    tasodifan tushib qolmasligi shu yerda ko'rinib turishi kerak.
   */
  private toListItem(
    row: ListRow | (DetailRow & { media: [] }),
  ): ProductListItemResponseDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      factory: row.factory,
      size: row.size,
      surface: row.surface,
      color: row.color,
      // Decimal → satr: `float` ga aylantirilsa pul hisobida aniqlik
      // yo'qolardi (CLAUDE.md qoida 7).
      sqmPerPallet: row.sqmPerPallet.toString(),
      weightPerPallet: row.weightPerPallet.toString(),
      primaryImageUrl: row.media[0]?.url ?? null,
      availability: this.toAvailability(row.stock?.stockPallets),
    };
  }

  /**
   * Zaxira soni → ochiq holat.
   *
   * 🔒 FAQAT ikki holat (TZ 3.2). Uch rangli indikator (IN_STOCK / LOW /
   *    OUT_OF_STOCK) auth bor joyda — optom mijoz kabineti va admin panel.
   *
   * `stock` yozuvi umuman bo'lmasligi mumkin (`ProductStock?`) — bunda
   * mahsulot MAVJUD EMAS deb qaraladi: "zaxira noma'lum" ni "bor" deb
   * ko'rsatish mijozga yo'q mahsulotni sotishga olib kelardi.
   */
  private toAvailability(stockPallets: number | undefined): PublicAvailability {
    return stockPallets && stockPallets > 0
      ? PublicAvailability.AVAILABLE
      : PublicAvailability.UNAVAILABLE;
  }
}
