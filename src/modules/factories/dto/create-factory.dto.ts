import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Yangi zavod (B-018).
 *
 * ⚠ `slug` bu yerda YO'Q — u `name` dan avtomatik yasaladi va yaratilgandan
 *   keyin o'zgarmaydi (katalog manzillari buzilmasligi uchun,
 *   [[update-factory.dto]] ga qara).
 */
export class CreateFactoryDto {
  @ApiProperty({ example: 'YONGXIN', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    description:
      'Logotip manzili. Ichki fayl yo‘li ham (`/uploads/...`), tashqi ' +
      'havola ham bo‘lishi mumkin — shuning uchun qat’iy URL tekshiruvi yo‘q.',
    example: '/uploads/factories/yongxin.png',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  logoUrl!: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Zavodning rasmiy sayti (to‘liq URL)',
    example: 'https://yongxin.example.com',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Vitrinada chiqish tartibi. Kichik son — oldinroq.',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
