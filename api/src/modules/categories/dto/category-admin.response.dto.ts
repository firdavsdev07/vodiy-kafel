import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CategoryPublicResponseDto } from './category-public.response.dto';

/**
 * Kategoriya — ADMIN javobi: ochiq maydonlar + boshqaruv holati.
 *
 * CLAUDE.md qoida 2: har bir entity uchun ikki xil DTO
 * ([[factory-admin.response.dto]] bilan bir xil naqsh).
 *
 * `productCount` ochiq javobdan OLINMAYDI — ma'nosi boshqa (ochiqda faqat
 * vitrinada ko'rinadiganlar, bu yerda hammasi), shuning uchun qayta e'lon
 * qilinadi.
 */
export class CategoryAdminResponseDto extends OmitType(
  CategoryPublicResponseDto,
  ['productCount'] as const,
) {
  @ApiProperty({
    description: 'Vitrinada chiqish tartibi (kichik son — oldinroq)',
    example: 10,
  })
  sortOrder!: number;

  @ApiProperty({
    description:
      '`false` — kategoriya o‘chirilgan (soft delete), ochiq API’da ko‘rinmaydi',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description:
      'Shu kategoriyaga bog‘langan mahsulotlar soni — o‘chirishdan oldin ' +
      'ta’sir doirasini ko‘rish uchun.',
    example: 24,
  })
  productCount!: number;

  @ApiProperty({ example: '2026-09-23T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-23T10:00:00.000Z' })
  updatedAt!: Date;
}
