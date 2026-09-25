import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IsPositiveDecimalString } from '../../../common/validators/decimal-string';
import { ProductSurface } from '../../../prisma';

/** Postgres `integer` chegarasi — `UpsertProductStockDto` bilan bir xil. */
const MAX_STOCK_PALLETS = 2_147_483_647;

/**
 * Yangi mahsulot — UMUMIY tavsif (B-021).
 *
 * ⚠ Bu yerda NARX YO'Q: narx filialga xos (`PUT /admin/branch-products`).
 *   Zaxira markaziy omborda (`PUT /admin/product-stocks`) — faqat
 *   BOSHLANG'ICH miqdor yaratishda beriladi (`stockPallets`, T-008).
 *   CLAUDE.md qoida 5.
 *
 * ⚠ `slug` yuborilmaydi — nom va o'lchamdan avtomatik yasaladi va keyin
 *   o'zgarmaydi (katalog havolalari buzilmasligi uchun).
 */
export class CreateProductDto {
  @ApiProperty({ example: 'Lyuks Keramogranit', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ description: 'Zavod ID' })
  @IsString()
  @IsNotEmpty()
  factoryId!: string;

  @ApiProperty({ description: 'O‘lcham ID' })
  @IsString()
  @IsNotEmpty()
  sizeId!: string;

  @ApiPropertyOptional({
    description:
      'Kategoriya ID (B-067) — ixtiyoriy, keyinroq ham to‘ldirilishi mumkin.',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ enum: ProductSurface, example: ProductSurface.POL })
  @IsEnum(ProductSurface)
  surface!: ProductSurface;

  @ApiPropertyOptional({ example: 'Bej', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description:
      '1 paddondagi m² — kalkulyator uchun MAJBURIY. Satr ko‘rinishida ' +
      '(float xatosi bo‘lmasligi uchun), verguldan keyin 4 tagacha raqam.',
    example: '1.44',
  })
  @IsPositiveDecimalString(6, 4)
  sqmPerPallet!: string;

  @ApiProperty({
    description:
      '1 paddon og‘irligi (kg) — transport soni shu asosda hisoblanadi. ' +
      'Satr ko‘rinishida, verguldan keyin 3 tagacha raqam.',
    example: '1250.5',
  })
  @IsPositiveDecimalString(7, 3)
  weightPerPallet!: string;

  @ApiPropertyOptional({
    description:
      'T-008: markaziy ombordagi boshlang‘ich miqdor (paddon). Berilmasa — ' +
      '0 (zaxira yozuvi baribir yaratiladi). Keyinchalik `PUT ' +
      '/admin/product-stocks` bilan o‘zgartiriladi — mahsulotni tahrirlash ' +
      'orqali EMAS. Buyurtmada shu miqdordan ko‘p berib bo‘lmaydi (T-005).',
    example: 120,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK_PALLETS)
  stockPallets?: number;
}
