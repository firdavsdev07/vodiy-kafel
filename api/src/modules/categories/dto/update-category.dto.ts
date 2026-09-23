import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

/**
 * Kategoriyani tahrirlash (B-067). Barcha maydonlar ixtiyoriy.
 *
 * ⚠ `name` o'zgarsa ham `slug` O'ZGARMAYDI — katalog filtri havolalari
 *   ([[update-factory.dto]] bilan bir xil qoida).
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({
    description:
      'Kategoriyani qayta faollashtirish yoki o‘chirish. `DELETE` endpointi ' +
      'ham shu maydonni `false` qiladi — qaytarish uchun shu yerdan `true`.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
