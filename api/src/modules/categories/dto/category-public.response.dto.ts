import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Kategoriya — OCHIQ javob (B-067, TZ 3.8: bosh sahifa/katalog vitrinasi).
 *
 * ⚠ Ichki maydonlar ATAYLAB yo'q: `sortOrder`, `isActive`, vaqt belgilari —
 *   [[factory-public.response.dto]] bilan bir xil naqsh.
 */
export class CategoryPublicResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Keramogranit' })
  name!: string;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'Porcelain stoneware',
  })
  nameEn!: string | null;

  @ApiProperty({
    description: 'URL uchun nom — katalog filtrida ishlatiladi',
    example: 'keramogranit',
  })
  slug!: string;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'Eng zich, eng chidamli yuza',
  })
  tagline!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'Yuqori bosim ostida presslanadi va 1250°C da pishiriladi.',
  })
  description!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: '/uploads/categories/keramogranit.webp',
  })
  coverImageUrl!: string | null;

  @ApiProperty({
    description:
      'Vitrinada KO‘RINADIGAN mahsulotlar soni (faol mahsulot, faol ' +
      'zavod) — `/products?categoryId=` shuncha natija qaytaradi. ' +
      'Admin javobidagi `productCount` boshqa: u hammasini sanaydi.',
    example: 12,
  })
  productCount!: number;
}
