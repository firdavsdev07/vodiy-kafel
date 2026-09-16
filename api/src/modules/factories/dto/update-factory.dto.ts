import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateFactoryDto } from './create-factory.dto';

/**
 * Zavodni tahrirlash (B-018). Barcha maydonlar ixtiyoriy.
 *
 * ⚠ `name` o'zgarsa ham `slug` O'ZGARMAYDI. Sabab: slug katalog manzilida
 *   ishlatiladi (`/factories/yongxin`) — uni jimgina almashtirish tashqi
 *   havolalarni va qidiruv indeksini buzardi.
 */
export class UpdateFactoryDto extends PartialType(CreateFactoryDto) {
  @ApiPropertyOptional({
    description:
      'Zavodni qayta faollashtirish yoki o‘chirish. `DELETE` endpointi ham ' +
      'shu maydonni `false` qiladi — o‘chirilgan zavodni qaytarish uchun ' +
      'shu yerdan `true` yuboriladi.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
