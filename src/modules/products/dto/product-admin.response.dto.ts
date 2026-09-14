import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StockStatus } from '../../../common/enums';
import { ProductSurface } from '../../../prisma';
import {
  ProductFactoryRefDto,
  ProductSizeRefDto,
} from './product-public.response.dto';

/**
 * Markaziy ombor zaxirasi — ICHKI ko'rinish.
 *
 * Aniq son shu yerda bo'lishi mumkin: bu faqat `/admin/*` javobi
 * (CLAUDE.md qoida 2, uchinchi daraja).
 */
export class ProductStockSummaryDto {
  @ApiProperty({
    description:
      'Markaziy ombordagi paddonlar soni. Zaxira yozuvi hali yo‘q bo‘lsa — 0.',
    example: 120,
  })
  stockPallets!: number;

  @ApiPropertyOptional({
    description:
      'Mahsulotning o‘z «kam qoldi» chegarasi. `null` — global sozlama ishlaydi.',
    example: null,
    nullable: true,
    type: Number,
  })
  lowStockThreshold!: number | null;

  @ApiProperty({
    description:
      'Amalda qo‘llangan chegara (o‘ziniki yoki `stock.lowThresholdPallets`).',
    example: 20,
  })
  effectiveThreshold!: number;

  @ApiProperty({ enum: StockStatus, example: StockStatus.IN_STOCK })
  stockStatus!: StockStatus;
}

/**
 * Mahsulot — ADMIN javobi (B-021).
 *
 * ⚠ Narx bu yerda YO'Q: u filialga xos va alohida endpointda
 *   (`GET /admin/branch-products`). Bitta umumiy "narx" maydoni bu yerda
 *   bo'lsa, qaysi filial narxi ekanligi noaniq qolardi.
 */
export class ProductAdminResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Lyuks Keramogranit' })
  name!: string;

  @ApiProperty({ example: 'lyuks-keramogranit-60x60' })
  slug!: string;

  @ApiProperty({ type: ProductFactoryRefDto })
  factory!: ProductFactoryRefDto;

  @ApiProperty({ type: ProductSizeRefDto })
  size!: ProductSizeRefDto;

  @ApiProperty({ enum: ProductSurface, example: ProductSurface.POL })
  surface!: ProductSurface;

  @ApiPropertyOptional({ example: 'Bej', nullable: true, type: String })
  color!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({ type: String, example: '1.44' })
  sqmPerPallet!: string;

  @ApiProperty({ type: String, example: '32.5' })
  weightPerPallet!: string;

  @ApiProperty({ example: 0 })
  viewCount!: number;

  @ApiProperty({
    description: '`false` — o‘chirilgan (soft delete), ochiq katalogda yo‘q',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({ type: ProductStockSummaryDto })
  stock!: ProductStockSummaryDto;

  @ApiProperty({ example: '2026-09-13T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-13T10:00:00.000Z' })
  updatedAt!: Date;
}
