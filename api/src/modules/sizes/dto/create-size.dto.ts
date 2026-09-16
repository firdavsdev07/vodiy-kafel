import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** O'lchamning aqlga sig'adigan chegarasi (sm) — xato kiritishdan himoya. */
export const MIN_SIDE_CM = 1;
export const MAX_SIDE_CM = 1000;

/**
 * Yangi o'lcham (B-019).
 *
 * ⚠ `label` bu yerda YO'Q — u `widthCm` va `heightCm` dan avtomatik
 *   yasaladi ("60x60"). Sabab: o'lchamlar KATALOG FILTRI uchun ishlatiladi
 *   (TZ 3.8). Agar yozuvni qo'lda kiritishga ruxsat berilsa, "60x60" deb
 *   yozilgan-u eni 30 qilib qo'yilgan yozuv paydo bo'lardi va filtr
 *   jimgina noto'g'ri ishlardi.
 */
export class CreateSizeDto {
  @ApiProperty({
    description: 'Eni, sm',
    example: 60,
    minimum: MIN_SIDE_CM,
    maximum: MAX_SIDE_CM,
  })
  @IsInt()
  @Min(MIN_SIDE_CM)
  @Max(MAX_SIDE_CM)
  widthCm!: number;

  @ApiProperty({
    description: 'Bo‘yi, sm',
    example: 60,
    minimum: MIN_SIDE_CM,
    maximum: MAX_SIDE_CM,
  })
  @IsInt()
  @Min(MIN_SIDE_CM)
  @Max(MAX_SIDE_CM)
  heightCm!: number;

  @ApiPropertyOptional({
    description: 'Filtr ro‘yxatida chiqish tartibi',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
