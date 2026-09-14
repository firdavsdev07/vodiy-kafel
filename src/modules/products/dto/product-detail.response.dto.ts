import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MediaType } from '../../../prisma';
import { ProductListItemResponseDto } from './product-public.response.dto';

/** Mahsulot media fayli — surat, 360° to'plam yoki 360° video. */
export class ProductMediaResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: '/uploads/products/lyuks-1.jpg' })
  url!: string;

  @ApiProperty({
    enum: MediaType,
    description:
      '`IMAGE` — oddiy surat, `IMAGE_360` — aylanuvchi surat to‘plami, ' +
      '`VIDEO_360` — 360° video.',
    example: MediaType.IMAGE,
  })
  type!: MediaType;
}

/**
 * Mahsulot sahifasi — kartadagi hamma narsa + tavsif va to'liq media.
 *
 * 🔒 Narx va zaxira aniq soni bu yerda ham YO'Q
 *   ([[product-public.response.dto]] izohiga qara).
 */
export class ProductDetailResponseDto extends ProductListItemResponseDto {
  @ApiPropertyOptional({
    example: 'Yuqori sifatli keramogranit, sirti silliq.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    type: [ProductMediaResponseDto],
    description: 'Suratlar va 360° materiallar — ko‘rsatish tartibida.',
  })
  media!: ProductMediaResponseDto[];
}
