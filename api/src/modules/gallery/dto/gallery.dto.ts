import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  toOptionalBoolean,
  toOptionalInt,
} from '../../../common/utils/query-boolean.util';
import { ProductAdminRefDto } from '../../products/dto';

/** Galereya rasmiga ulangan mahsulot — ochiq ko'rinish. */
export class GalleryProductRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Lyuks Granit Bej' })
  name!: string;

  @ApiProperty({
    description: 'Mahsulot sahifasiga havola uchun — `/products/:slug`',
    example: 'lyuks-granit-bej',
  })
  slug!: string;
}

export class GalleryPublicItemDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: '/uploads/gallery/0b6f1c1e.jpg' })
  imageUrl!: string;

  @ApiPropertyOptional({
    example: 'Farg‘ona, xususiy uy — oshxona',
    nullable: true,
    type: String,
  })
  title!: string | null;

  @ApiPropertyOptional({
    type: GalleryProductRefDto,
    nullable: true,
    description:
      'Rasmdagi mahsulot (TZ 3.1). Bog‘lanmagan yoki mahsulot vitrinadan ' +
      'olib tashlangan bo‘lsa — `null`.',
  })
  product!: GalleryProductRefDto | null;
}

export class GalleryAdminItemDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: '/uploads/gallery/0b6f1c1e.jpg' })
  imageUrl!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  title!: string | null;

  @ApiPropertyOptional({
    type: ProductAdminRefDto,
    nullable: true,
    description: 'Bog‘langan mahsulot — o‘chirilgan bo‘lsa ham ko‘rinadi.',
  })
  product!: ProductAdminRefDto | null;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2026-09-14T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-14T10:00:00.000Z' })
  updatedAt!: Date;
}

export class GalleryAdminQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Shu mahsulotga bog‘langan rasmlar' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Faol (`true`) yoki yashirilgan (`false`)',
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

/** Rasm yuklash bilan birga keladigan maydonlar (multipart). */
export class CreateGalleryItemDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Rasmdagi mahsulot ID' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Ko‘rsatish tartibi (kichik — oldinroq)',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  // multipart forma — qiymat satr bo'lib keladi
  @Transform(toOptionalInt)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** Swagger uchun multipart sxemasi. */
export class CreateGalleryItemBodyDto extends CreateGalleryItemDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Rasm: JPG, PNG yoki WEBP, 10 MB gacha',
  })
  file!: unknown;
}

/**
 * Tahrirlash. Rasmning o'zi almashtirilmaydi — yangi rasm = yangi yozuv.
 */
export class UpdateGalleryItemDto {
  @ApiPropertyOptional({
    maxLength: 200,
    nullable: true,
    type: String,
    description: '`null` — sarlavhani olib tashlash',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: '`null` — mahsulot bilan bog‘lanishni uzish',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productId?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '`false` — ochiq galereyadan yashirish' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
