import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toOptionalBoolean } from '../../../common/utils/query-boolean.util';
import { IsPositiveDecimalString } from '../../../common/validators/decimal-string';

/** Filial narxi — `Decimal(14, 2)`: butun qism 12 raqamgacha. */
const PRICE_INTEGER_DIGITS = 12;
const PRICE_SCALE = 2;

/**
 * Filial narxlari ro'yxati filtri (B-021).
 *
 * 🔒 `branchId` — faqat SUPER_ADMIN uchun FILTR. Filial admini o'zinikidan
 *    boshqasini so'rasa 404 oladi; bermasa — baribir o'z filiali
 *    (BranchScopeService, B-051).
 */
export class BranchProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Filial bo‘yicha filtr. Cheklangan rol uchun faqat o‘z filiali ' +
      'mumkin (boshqasi — 404).',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Mahsulot bo‘yicha filtr' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Shu filialda sotiladiganlar (`true`) yoki yo‘q (`false`)',
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

/**
 * Filial narxini o'rnatish — bor bo'lsa yangilanadi, yo'q bo'lsa yaratiladi.
 *
 * 🔒 `branchId` cheklangan rol uchun e'tiborga olinmaydi: narx har doim
 *    uning O'Z filialiga yoziladi, boshqa filial ko'rsatilsa — 404.
 *    SUPER_ADMIN uchun esa majburiy.
 */
export class UpsertBranchProductDto {
  @ApiPropertyOptional({
    description:
      'SUPER_ADMIN uchun majburiy. Filial admini yubormasa ham bo‘ladi — ' +
      'narx o‘z filialiga yoziladi.',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ description: 'Mahsulot ID' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    description: 'Narx, so‘m / m². Satr ko‘rinishida (float emas).',
    example: '85000',
  })
  @IsPositiveDecimalString(PRICE_INTEGER_DIGITS, PRICE_SCALE)
  pricePerSqm!: string;

  @ApiPropertyOptional({
    description:
      'Shu filialda sotiladimi. Yangi yozuvda berilmasa — `true`, ' +
      'mavjudida berilmasa — o‘zgarmaydi.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Faqat narxni o'zgartirish. */
export class UpdateBranchProductPriceDto {
  @ApiProperty({ description: 'Yangi narx, so‘m / m²', example: '92000' })
  @IsPositiveDecimalString(PRICE_INTEGER_DIGITS, PRICE_SCALE)
  pricePerSqm!: string;
}

export class BranchRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Vodiy Kafel — Farg‘ona' })
  name!: string;

  @ApiProperty({ example: 'Farg‘ona' })
  city!: string;
}

export class ProductAdminRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Lyuks Keramogranit' })
  name!: string;

  @ApiProperty({ example: 'lyuks-keramogranit-60x60' })
  slug!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

/**
 * Filial narxi — ADMIN javobi.
 *
 * ⚠ Bu — filialning BAZAVIY narxi. Mijozga individual qoidalar (B-052)
 *   bu yerda ko'rinmaydi va qo'llanmaydi.
 */
export class BranchProductAdminResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ type: BranchRefDto })
  branch!: BranchRefDto;

  @ApiProperty({ type: ProductAdminRefDto })
  product!: ProductAdminRefDto;

  @ApiProperty({
    description: 'So‘m / m², satr ko‘rinishida',
    type: String,
    example: '85000',
  })
  pricePerSqm!: string;

  @ApiProperty({ description: 'Shu filialda sotiladimi', example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-09-13T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-13T10:00:00.000Z' })
  updatedAt!: Date;
}
