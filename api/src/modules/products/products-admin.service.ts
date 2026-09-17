import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { ProductSortField, SortOrder } from '../../common/enums';
import { slugify } from '../../common/utils';
import { MediaType, Prisma, PrismaService } from '../../prisma';
import { AppEvent, type ProductActivatedEvent } from '../notifications/events';
import type {
  CreateProductDto,
  ProductAdminQueryDto,
  ProductAdminResponseDto,
  UpdateProductDto,
} from './dto';
import { ProductStocksService } from './product-stocks.service';

/**
 * 🔒 `branchProducts` bu yerda ham YO'Q: mahsulot javobida bitta "narx"
 *    bo'lsa, u qaysi filialniki ekani noaniq qolardi. Filial narxlari —
 *    alohida endpoint, filial izolyatsiyasi bilan.
 */
const ADMIN_SELECT = {
  id: true,
  name: true,
  slug: true,
  surface: true,
  color: true,
  description: true,
  sqmPerPallet: true,
  weightPerPallet: true,
  viewCount: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  factory: { select: { id: true, name: true, slug: true } },
  size: { select: { id: true, label: true, widthCm: true, heightCm: true } },
  stock: { select: { stockPallets: true, lowStockThreshold: true } },
  // Jadvaldagi muqova (B-060). `take: 1` — ro'yxat uchun N+1 so'rov
  // bo'lmasin; 360° materiallar muqova bo'lolmaydi, shuning uchun
  // `type: IMAGE` filtri (ochiq katalogdagi `PRIMARY_IMAGE` bilan bir xil).
  media: {
    where: { type: MediaType.IMAGE },
    orderBy: { sortOrder: 'asc' },
    take: 1,
    select: { url: true },
  },
} as const;

type AdminRow = Prisma.ProductGetPayload<{ select: typeof ADMIN_SELECT }>;

const PRODUCT_NOT_FOUND = 'Mahsulot topilmadi';

/**
 * Mahsulot URL nomi: nom + o'lcham (`lyuks-keramogranit-60x60`).
 *
 * O'lcham qo'shiladi, chunki bitta dizayn odatda bir necha o'lchamda
 * chiqadi — faqat nomdan yasalsa, ikkinchi o'lcham darhol 409 olardi.
 * Nomning o'zida o'lcham bo'lsa, ikki marta yozilmaydi.
 */
export const buildProductSlug = (name: string, sizeLabel: string): string => {
  const nameSlug = slugify(name);
  const sizeSlug = slugify(sizeLabel);
  return nameSlug.endsWith(sizeSlug) ? nameSlug : `${nameSlug}-${sizeSlug}`;
};

/**
 * Mahsulot katalogi — admin tomoni (B-021).
 *
 * ⚠ Katalog UMUMIY: filialga bog'lanmagan, shuning uchun `BranchScopeService`
 *   qo'llanmaydi. Yozish huquqi faqat SUPER_ADMIN da (controller) — filial
 *   admini yaratgan mahsulot boshqa filiallarda ham paydo bo'lardi.
 */
@Injectable()
export class ProductsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stocks: ProductStocksService,
    private readonly events: EventEmitter2,
  ) {}

  async findAll(
    query: ProductAdminQueryDto,
  ): Promise<PaginatedResult<ProductAdminResponseDto>> {
    const where = this.buildWhere(query);

    const [total, rows, globalThreshold] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: ADMIN_SELECT,
        orderBy: this.buildOrderBy(query),
        skip: query.skip,
        take: query.take,
      }),
      this.stocks.getGlobalLowThreshold(),
    ]);

    return paginate(
      rows.map((row) => this.toDto(row, globalThreshold)),
      total,
      query,
    );
  }

  async findOne(id: string): Promise<ProductAdminResponseDto> {
    const [row, globalThreshold] = await Promise.all([
      this.prisma.product.findUnique({ where: { id }, select: ADMIN_SELECT }),
      this.stocks.getGlobalLowThreshold(),
    ]);
    if (!row) throw new NotFoundException(PRODUCT_NOT_FOUND);
    return this.toDto(row, globalThreshold);
  }

  async create(dto: CreateProductDto): Promise<ProductAdminResponseDto> {
    if (!slugify(dto.name)) {
      throw new BadRequestException(
        'Nomdan URL yasab bo‘lmadi — kamida bitta harf yoki raqam bo‘lishi kerak',
      );
    }

    const [size] = await Promise.all([
      this.requireSize(dto.sizeId),
      this.requireFactory(dto.factoryId),
    ]);
    const slug = buildProductSlug(dto.name, size.label);

    try {
      const row = await this.prisma.product.create({
        data: { ...dto, slug },
        select: ADMIN_SELECT,
      });
      if (row.isActive) this.emitActivated(row.id);
      return this.toDto(row, await this.stocks.getGlobalLowThreshold());
    } catch (error) {
      // Tekshiruv bazaning unique cheklovida: oldindan `findUnique` qilish
      // ikki admin bir vaqtda yaratganda poygada yutqazardi.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Bu nom va o‘lchamdagi mahsulot bor (URL: ${slug}) — boshqa nom tanlang`,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductAdminResponseDto> {
    await this.assertExists(id);
    await Promise.all([
      dto.sizeId && this.requireSize(dto.sizeId),
      dto.factoryId && this.requireFactory(dto.factoryId),
    ]);

    const row = await this.prisma.product.update({
      where: { id },
      data: dto,
      select: ADMIN_SELECT,
    });
    if (dto.isActive === true) this.emitActivated(row.id);
    return this.toDto(row, await this.stocks.getGlobalLowThreshold());
  }

  /** Yangi mahsulot e'loni (B-040) — bir martalikni tinglovchi ta'minlaydi. */
  private emitActivated(productId: string): void {
    this.events.emit(AppEvent.ProductActivated, {
      productId,
    } satisfies ProductActivatedEvent);
  }

  /**
   * Soft delete. Haqiqiy `DELETE` mumkin emas: `OrderItem` mahsulotga
   * `Restrict` bilan bog'langan — buyurtma tarixi yo'qolmasligi kerak.
   */
  async softDelete(id: string): Promise<ProductAdminResponseDto> {
    await this.assertExists(id);

    const row = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
      select: ADMIN_SELECT,
    });
    return this.toDto(row, await this.stocks.getGlobalLowThreshold());
  }

  private buildWhere(query: ProductAdminQueryDto): Prisma.ProductWhereInput {
    const { factoryId, sizeId, surface, search, isActive } = query;

    return {
      ...(factoryId && { factoryId }),
      ...(sizeId && { sizeId }),
      ...(surface && { surface }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { factory: { name: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };
  }

  /** Ikkinchi mezon `id` — sahifalashda qatorlar sakrab ketmasligi uchun. */
  private buildOrderBy(
    query: ProductAdminQueryDto,
  ): Prisma.ProductOrderByWithRelationInput[] {
    const field = query.sortBy ?? ProductSortField.CREATED_AT;
    const direction =
      query.sortOrder === SortOrder.ASC
        ? Prisma.SortOrder.asc
        : Prisma.SortOrder.desc;

    return [{ [field]: direction }, { id: Prisma.SortOrder.asc }];
  }

  /**
   * Body'dagi havola noto'g'ri — 400 (404 emas): so'ralgan RESURS
   * (mahsulot) emas, uning maydoni xato.
   */
  private async requireSize(sizeId: string): Promise<{ label: string }> {
    const size = await this.prisma.productSize.findUnique({
      where: { id: sizeId },
      select: { label: true },
    });
    if (!size) throw new BadRequestException('O‘lcham topilmadi');
    return size;
  }

  private async requireFactory(factoryId: string): Promise<void> {
    const factory = await this.prisma.factory.findUnique({
      where: { id: factoryId },
      select: { id: true },
    });
    if (!factory) throw new BadRequestException('Zavod topilmadi');
  }

  private async assertExists(id: string): Promise<void> {
    const found = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException(PRODUCT_NOT_FOUND);
  }

  private toDto(
    row: AdminRow,
    globalThreshold: number,
  ): ProductAdminResponseDto {
    const { stock, sqmPerPallet, weightPerPallet, media, ...rest } = row;
    return {
      ...rest,
      sqmPerPallet: sqmPerPallet.toString(),
      weightPerPallet: weightPerPallet.toString(),
      coverUrl: media[0]?.url ?? null,
      stock: this.stocks.summarize(stock, globalThreshold),
    };
  }
}
