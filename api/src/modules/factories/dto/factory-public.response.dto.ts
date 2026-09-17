import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Zavod — OCHIQ javob (TZ 3.8: bosh sahifadagi logotip-karta vitrinasi).
 *
 * ⚠ Ichki maydonlar ATAYLAB yo'q: `sortOrder` (saralash tartibi tashqariga
 *   chiqmaydi — u admin qaroridir), `isActive` (o'chirilgan zavod ro'yxatga
 *   umuman tushmaydi), vaqt belgilari.
 */
export class FactoryPublicResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'YONGXIN' })
  name!: string;

  @ApiProperty({
    description: 'URL uchun nom — katalog manzilida ishlatiladi',
    example: 'yongxin',
  })
  slug!: string;

  @ApiProperty({ example: '/uploads/factories/yongxin.png' })
  logoUrl!: string;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'Xitoyning yirik keramogranit ishlab chiqaruvchisi',
  })
  description!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'https://yongxin.example.com',
  })
  websiteUrl!: string | null;
}
