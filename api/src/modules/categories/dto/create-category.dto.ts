import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Yangi kategoriya (B-067, TZ 3.8).
 *
 * ⚠ `slug` bu yerda YO'Q — u `name` dan avtomatik yasaladi va yaratilgandan
 *   keyin o'zgarmaydi ([[update-category.dto]] ga qara).
 *
 * ⚠ Muqova surati bu yerda YO'Q — u `POST /admin/categories/{id}/image`
 *   orqali alohida yuklanadi (Branch.buildingImageUrl bilan bir xil naqsh).
 */
export class CreateCategoryDto {
  @ApiProperty({ example: 'Keramogranit', maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    description: 'Ingliz tilidagi nom (kelajakdagi ko‘p tillilik uchun)',
    example: 'Porcelain stoneware',
    maxLength: 120,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nameEn?: string;

  @ApiPropertyOptional({
    description: 'Qisqa shior — kartochkada nom ostida',
    example: 'Eng zich, eng chidamli yuza',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

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
