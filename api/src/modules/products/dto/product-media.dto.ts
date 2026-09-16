import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { MediaType } from '../../../prisma';

/** Yuklashda faylga qo'shimcha maydonlar (multipart). */
export class UploadProductMediaDto {
  @ApiPropertyOptional({
    enum: MediaType,
    default: MediaType.IMAGE,
    description:
      '`IMAGE` va `IMAGE_360` — JPG/PNG/WEBP surat, `VIDEO_360` — MP4 video.',
  })
  @IsOptional()
  @IsEnum(MediaType)
  type?: MediaType;
}

/** Swagger uchun: multipart forma sxemasi. */
export class UploadProductMediaBodyDto extends UploadProductMediaDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Fayl: JPG, PNG, WEBP yoki MP4, 10 MB gacha',
  })
  file!: unknown;
}

export class ReorderProductMediaDto {
  @ApiProperty({
    type: [String],
    description:
      'Mahsulotning BARCHA media ID lari — yangi tartibda. Birinchisi ' +
      'kartada ko‘rinadi (agar u `IMAGE` bo‘lsa).',
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  mediaIds!: string[];
}

export class ProductMediaAdminResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  productId!: string;

  @ApiProperty({
    example: '/uploads/products/0b6f1c1e-6a4f-4a57-9a3b-2f7c1d9e8a11.jpg',
  })
  url!: string;

  @ApiProperty({ enum: MediaType, example: MediaType.IMAGE })
  type!: MediaType;

  @ApiProperty({ description: 'Ko‘rsatish tartibi (0 — birinchi)', example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: '2026-09-14T10:00:00.000Z' })
  createdAt!: Date;
}
