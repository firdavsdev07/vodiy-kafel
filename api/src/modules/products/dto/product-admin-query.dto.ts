import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { toOptionalBoolean } from '../../../common/utils/query-boolean.util';
import { Transform } from 'class-transformer';
import { ProductQueryDto } from './product-query.dto';

/**
 * Admin mahsulotlar ro'yxati filtri (B-021).
 *
 * Ochiq filtrdan farqi — `isActive`: admin o'chirilgan mahsulotlarni ham
 * ko'radi. Berilmasa — hammasi.
 */
export class ProductAdminQueryDto extends ProductQueryDto {
  @ApiPropertyOptional({
    description: 'Faqat faol (`true`) yoki faqat o‘chirilgan (`false`)',
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}
