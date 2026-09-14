import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

/**
 * Mahsulotni tahrirlash (B-021). Barcha maydonlar ixtiyoriy.
 *
 * ⚠ `name` yoki o'lcham o'zgarsa ham `slug` O'ZGARMAYDI — katalog
 *   manzillari va tashqi havolalar buzilmasligi uchun
 *   ([[update-factory.dto]] bilan bir xil qoida).
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description:
      'O‘chirilgan mahsulotni qaytarish: `true`. `DELETE` ham shu maydonni ' +
      '`false` qiladi.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
