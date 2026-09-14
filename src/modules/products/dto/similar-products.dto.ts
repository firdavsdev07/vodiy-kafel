import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { toOptionalInt } from '../../../common/utils/query-boolean.util';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ProductAdminRefDto } from './branch-product.dto';

export const DEFAULT_SIMILAR_LIMIT = 8;
export const MAX_SIMILAR = 20;

export class SimilarProductsQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_SIMILAR,
    default: DEFAULT_SIMILAR_LIMIT,
  })
  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(1)
  @Max(MAX_SIMILAR)
  limit: number = DEFAULT_SIMILAR_LIMIT;
}

/**
 * O'xshash mahsulotlar ro'yxatini TO'LIQ almashtirish.
 * Bo'sh massiv — barcha bog'lanishlarni olib tashlash.
 */
export class SetSimilarProductsDto {
  @ApiProperty({
    type: [String],
    maxItems: MAX_SIMILAR,
    description:
      'O‘xshash mahsulot ID lari — ko‘rsatish tartibida. Oldingi ro‘yxat ' +
      'butunlay almashtiriladi.',
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_SIMILAR)
  @IsString({ each: true })
  similarProductIds!: string[];
}

export class SimilarProductLinkDto {
  @ApiProperty({ type: ProductAdminRefDto })
  product!: ProductAdminRefDto;

  @ApiProperty({ example: 0 })
  sortOrder!: number;
}
