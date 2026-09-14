import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { ProductSortField } from '../../../common/enums';
import { ProductSurface } from '../../../prisma';

/**
 * Katalog filtri (B-020, TZ 3.8).
 *
 * ⚠ Bu yerda `branchId` YO'Q va bo'lmaydi: ochiq katalog narx ko'rsatmaydi,
 *   ya'ni filial kesimi ham kerak emas. Auth bor joyda filial HAR DOIM
 *   tokendan olinadi (CLAUDE.md qoida 5).
 */
export class ProductQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Zavod bo‘yicha filtr' })
  @IsOptional()
  @IsString()
  factoryId?: string;

  @ApiPropertyOptional({ description: 'O‘lcham bo‘yicha filtr' })
  @IsOptional()
  @IsString()
  sizeId?: string;

  @ApiPropertyOptional({
    enum: ProductSurface,
    description: 'Sirt turi: pol yoki devor',
  })
  @IsOptional()
  @IsEnum(ProductSurface)
  surface?: ProductSurface;

  @ApiPropertyOptional({
    description:
      'Qidiruv — mahsulot nomi yoki zavod nomi bo‘yicha (katta-kichik ' +
      'harf farqlanmaydi)',
    example: 'yongxin',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: ProductSortField,
    default: ProductSortField.CREATED_AT,
    description:
      'Saralash maydoni. Ro‘yxatdagidan boshqasi qabul qilinmaydi.\n\n' +
      'Narx bo‘yicha saralash YO‘Q — ochiq katalogda narx ko‘rinmaydi.',
  })
  @IsOptional()
  @IsEnum(ProductSortField)
  declare sortBy?: ProductSortField;
}
