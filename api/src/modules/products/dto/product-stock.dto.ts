import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { StockStatus } from '../../../common/enums';
import { ProductStockSummaryDto } from './product-admin.response.dto';
import { ProductAdminRefDto } from './branch-product.dto';

/** Postgres `integer` chegarasi — undan kattasi bazada xato beradi. */
const MAX_PALLETS = 2_147_483_647;

export class ProductStockQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Mahsulot bo‘yicha filtr' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    enum: StockStatus,
    description:
      'Zaxira holati bo‘yicha filtr (B-063). Chegara `effectiveThreshold` ' +
      'bilan AYNAN bir xil hisoblanadi: mahsulotning o‘z ' +
      '`lowStockThreshold` i, u bo‘lmasa global sozlama.\n\n' +
      '⚠ Bu HISOBLANADIGAN qiymat — bazada `stock_status` ustuni yo‘q. ' +
      'Shuning uchun bu maydon bo‘yicha SARALASH yo‘q, faqat filtr.',
  })
  @IsOptional()
  @IsEnum(StockStatus)
  stockStatus?: StockStatus;
}

/**
 * Markaziy ombor zaxirasini o'rnatish (B-021).
 *
 * ⚠ `branchId` YO'Q va bo'lmaydi: zaxira filialga bog'lanmagan, butun
 *   tizim uchun bitta son (TZ 3.2, B-008).
 *
 * ⚠ `stockPallets` — YANGI QIYMAT, farq emas. Inventarizatsiyadan keyin
 *   moderator ombordagi haqiqiy sonni yozadi.
 */
export class UpsertProductStockDto {
  @ApiProperty({ description: 'Mahsulot ID' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Ombordagi paddonlar soni', example: 120 })
  @IsInt()
  @Min(0)
  @Max(MAX_PALLETS)
  stockPallets!: number;

  @ApiPropertyOptional({
    description:
      '«Kam qoldi» chegarasi. `null` — global sozlamaga qaytarish; ' +
      'yuborilmasa — o‘zgarmaydi.',
    nullable: true,
    type: Number,
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PALLETS)
  lowStockThreshold?: number | null;
}

/** Zaxira qatori — ADMIN javobi. */
export class ProductStockAdminResponseDto extends ProductStockSummaryDto {
  @ApiProperty({ type: ProductAdminRefDto })
  product!: ProductAdminRefDto;

  @ApiPropertyOptional({
    description:
      'Zaxira oxirgi marta qachon o‘zgargan. `null` — hali hech qachon kiritilmagan.',
    nullable: true,
    type: Date,
  })
  updatedAt!: Date | null;
}
