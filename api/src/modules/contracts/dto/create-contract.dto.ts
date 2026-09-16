import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

const INN_PATTERN = /^\d{9}$/;

/**
 * POST /wholesale/contracts (B-045, TZ 3.10).
 *
 * ⚠ Narx/summa bu yerda YO'Q — shartnoma faqat kompaniya va yetkazib
 *   berish shartlarini hujjatlashtiradi, checkout emas.
 */
export class CreateContractDto {
  @ApiProperty({
    example: '301234567',
    description:
      'INN — 9 raqam. Shu bo‘yicha kompaniya ma’lumoti so‘raladi ' +
      '(hozircha 🧪 mock, Didox.uz B-044 spike’dan keyin ulanadi).',
  })
  @IsString()
  @Matches(INN_PATTERN, { message: 'INN 9 ta raqamdan iborat bo‘lishi kerak' })
  inn!: string;

  @ApiPropertyOptional({
    description:
      'Shartnoma qaysi buyurtma munosabati bilan tuzilayotgani. ' +
      'Berilsa — faqat O‘Z buyurtmangiz bo‘lishi kerak.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  orderId?: string;
}
