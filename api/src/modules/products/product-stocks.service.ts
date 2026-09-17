import { Injectable, NotFoundException } from '@nestjs/common';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { StockStatus } from '../../common/enums';
import { toStockStatus } from '../../common/utils/stock-status.util';
import { Prisma, PrismaService } from '../../prisma';
import { SettingsService } from '../settings/settings.service';
import type {
  ProductStockAdminResponseDto,
  ProductStockQueryDto,
  ProductStockSummaryDto,
  UpsertProductStockDto,
} from './dto';

const PRODUCT_REF_SELECT = {
  id: true,
  name: true,
  slug: true,
  isActive: true,
} as const;

interface StockRow {
  stockPallets: number;
  lowStockThreshold: number | null;
}

/**
 * Markaziy ombor zaxirasi (B-021).
 *
 * ⚠ `BranchScopeService` bu yerda QO'LLANMAYDI: zaxira filialga
 *   bog'lanmagan, hamma bir xil sonni ko'radi (B-008, B-051 qamrovi).
 *   Kim O'ZGARTIRA olishini controller'dagi rol cheklovi hal qiladi.
 */
@Injectable()
export class ProductStocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  /**
   * Global «kam qoldi» chegarasi — keshlangan sozlamadan (B-025). Yozuv yo'q
   * yoki buzilgan bo'lsa `SettingsService` standart qiymatni qaytaradi.
   */
  getGlobalLowThreshold(): Promise<number> {
    return this.settings.get('stock.lowThresholdPallets');
  }

  /**
   * Zaxira yozuvi → ichki xulosa.
   *
   * Yozuv yo'q bo'lsa — 0 paddon va OUT_OF_STOCK: "noma'lum" zaxirani
   * "bor" deb ko'rsatish yo'q mahsulotni sotishga olib kelardi.
   */
  summarize(
    stock: StockRow | null,
    globalThreshold: number,
  ): ProductStockSummaryDto {
    const effectiveThreshold = stock?.lowStockThreshold ?? globalThreshold;

    return {
      stockPallets: stock?.stockPallets ?? 0,
      lowStockThreshold: stock?.lowStockThreshold ?? null,
      effectiveThreshold,
      stockStatus: toStockStatus(stock?.stockPallets, effectiveThreshold),
    };
  }

  /**
   * Zaxira ro'yxati — MAHSULOTLAR bo'yicha, zaxira yozuvlari bo'yicha emas.
   *
   * Sabab: yangi mahsulotda zaxira yozuvi hali yo'q. Faqat `product_stocks`
   * jadvali ko'rsatilsa, moderator bunday mahsulotni ro'yxatda umuman
   * ko'rmasdi va zaxira kiritishni unutib qo'yardi.
   */
  /**
   * Zaxira holati bo'yicha `where` (B-063).
   *
   * ⚠ `stockStatus` bazada YO'Q — u `stockPallets` va chegaradan
   *   hisoblanadi. Chegara esa mahsulotning o'z `lowStockThreshold` i
   *   YOKI global sozlama, ya'ni har qator uchun boshqa bo'lishi mumkin.
   *   Shuning uchun filtr ikki holatga bo'linadi va o'z chegarasi bor
   *   qatorlarda USTUNLAR solishtiriladi (Prisma field reference —
   *   `debtFilter` dagi naqsh bilan bir xil; raw SQL ishlatilmaydi).
   *
   * 🔒 Bu funksiya `findAll` da ham, bosh sahifa statistikasida ham
   *    ishlatiladi (B-063): ro'yxatdagi son bilan kartochkadagi son
   *    HAR DOIM bir xil bo'lsin.
   */
  stockStatusWhere(
    status: StockStatus,
    globalThreshold: number,
  ): Prisma.ProductWhereInput {
    const ownThreshold = this.prisma.productStock.fields.lowStockThreshold;

    // Zaxira yozuvi yo'q mahsulot — "tugagan" (noma'lumni "bor" demaymiz)
    if (status === StockStatus.OUT_OF_STOCK) {
      return {
        OR: [
          { stock: { is: null } },
          { stock: { is: { stockPallets: { lte: 0 } } } },
        ],
      };
    }

    const compare =
      status === StockStatus.LOW
        ? { lte: globalThreshold }
        : { gt: globalThreshold };
    const compareOwn =
      status === StockStatus.LOW ? { lte: ownThreshold } : { gt: ownThreshold };

    return {
      stock: {
        is: {
          stockPallets: { gt: 0 },
          OR: [
            { lowStockThreshold: null, stockPallets: compare },
            { NOT: { lowStockThreshold: null }, stockPallets: compareOwn },
          ],
        },
      },
    };
  }

  async findAll(
    query: ProductStockQueryDto,
  ): Promise<PaginatedResult<ProductStockAdminResponseDto>> {
    // Chegara filtrga kerak — sozlama boshqa so'rovlardan OLDIN olinadi
    const globalThresholdForFilter = query.stockStatus
      ? await this.getGlobalLowThreshold()
      : undefined;
    const where: Prisma.ProductWhereInput = {
      ...(query.productId && { id: query.productId }),
      ...(query.stockStatus && globalThresholdForFilter !== undefined
        ? this.stockStatusWhere(query.stockStatus, globalThresholdForFilter)
        : {}),
    };

    const [total, rows, globalThreshold] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        select: {
          ...PRODUCT_REF_SELECT,
          stock: {
            select: {
              stockPallets: true,
              lowStockThreshold: true,
              updatedAt: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
      this.getGlobalLowThreshold(),
    ]);

    return paginate(
      rows.map(({ stock, ...product }) => ({
        product,
        ...this.summarize(stock, globalThreshold),
        updatedAt: stock?.updatedAt ?? null,
      })),
      total,
      query,
    );
  }

  /**
   * Zaxirani o'rnatadi — yozuv bo'lmasa yaratiladi.
   *
   * `lowStockThreshold`: `undefined` — tegilmaydi, `null` — global
   * sozlamaga qaytariladi. Ikkisini farqlash uchun `??` emas, aniq
   * `!== undefined` tekshiruvi.
   */
  async upsert(
    dto: UpsertProductStockDto,
  ): Promise<ProductStockAdminResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: PRODUCT_REF_SELECT,
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    const thresholdChange =
      dto.lowStockThreshold !== undefined
        ? { lowStockThreshold: dto.lowStockThreshold }
        : {};

    const [stock, globalThreshold] = await Promise.all([
      this.prisma.productStock.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          stockPallets: dto.stockPallets,
          ...thresholdChange,
        },
        update: { stockPallets: dto.stockPallets, ...thresholdChange },
        select: {
          stockPallets: true,
          lowStockThreshold: true,
          updatedAt: true,
        },
      }),
      this.getGlobalLowThreshold(),
    ]);

    return {
      product,
      ...this.summarize(stock, globalThreshold),
      updatedAt: stock.updatedAt,
    };
  }
}
