import { ApiProperty } from '@nestjs/swagger';
import { FactoryPublicResponseDto } from './factory-public.response.dto';

/**
 * Zavod — ADMIN javobi: ochiq maydonlar + boshqaruv holati.
 *
 * CLAUDE.md qoida 2: har bir entity uchun ikki xil DTO. Bu yerda sir
 * saqlanadigan narsa yo'q (zavodda na narx, na zaxira bor), lekin ikki
 * DTO naqshi baribir saqlanadi — `isActive` va `sortOrder` ochiq API'ga
 * tushib qolmasin.
 */
export class FactoryAdminResponseDto extends FactoryPublicResponseDto {
  @ApiProperty({
    description: 'Vitrinada chiqish tartibi (kichik son — oldinroq)',
    example: 10,
  })
  sortOrder!: number;

  @ApiProperty({
    description:
      '`false` — zavod o‘chirilgan (soft delete), ochiq API’da ko‘rinmaydi',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description:
      'Shu zavodga bog‘langan mahsulotlar soni — zavodni o‘chirishdan ' +
      'oldin ta’sir doirasini ko‘rish uchun.',
    example: 12,
  })
  productCount!: number;

  @ApiProperty({ example: '2026-09-13T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-13T10:00:00.000Z' })
  updatedAt!: Date;
}
