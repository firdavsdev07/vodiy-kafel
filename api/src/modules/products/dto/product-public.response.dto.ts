import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PublicAvailability } from '../../../common/enums';
import { ProductSurface } from '../../../prisma';

/** Mahsulot kartasidagi zavod — faqat havola uchun zarur maydonlar. */
export class ProductFactoryRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'YONGXIN' })
  name!: string;

  @ApiProperty({ example: 'yongxin' })
  slug!: string;
}

/** Mahsulot kartasidagi o'lcham. */
export class ProductSizeRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: '60x60' })
  label!: string;

  @ApiProperty({ example: 60 })
  widthCm!: number;

  @ApiProperty({ example: 60 })
  heightCm!: number;
}

/**
 * Mahsulot — OCHIQ katalog kartasi (B-020).
 *
 * 🔒 JAVOBDA YO'Q VA HECH QACHON BO'LMAYDI (CLAUDE.md qoida 2, G2, G3):
 *   • narx — u `BranchProduct` da, filialga va mijozga bog'liq (qoida 11).
 *     Ochiq katalog uni umuman so'ramaydi, shuning uchun sizib chiqishi
 *     tuzilma darajasida imkonsiz.
 *   • zaxira ANIQ SONI — faqat `availability` hisoblanadi.
 *   • filial nomi yoki kesimi — qaysi filial narxi ekani sir.
 */
export class ProductListItemResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Lyuks Keramogranit' })
  name!: string;

  @ApiProperty({
    description: 'Katalog manzili uchun — `/products/:slug`',
    example: 'lyuks-keramogranit-60x60',
  })
  slug!: string;

  @ApiProperty({ type: ProductFactoryRefDto })
  factory!: ProductFactoryRefDto;

  @ApiProperty({ type: ProductSizeRefDto })
  size!: ProductSizeRefDto;

  @ApiProperty({ enum: ProductSurface, example: ProductSurface.POL })
  surface!: ProductSurface;

  @ApiPropertyOptional({
    type: String,
    example: 'Bej',
    nullable: true,
  })
  color!: string | null;

  @ApiProperty({
    description:
      '1 paddondagi m². O‘nlik son SATR ko‘rinishida keladi — u pul ' +
      'hisobiga kiradi va `float` ga aylantirilsa aniqlik yo‘qolardi ' +
      '(CLAUDE.md qoida 7).',
    type: String,
    example: '1.44',
  })
  sqmPerPallet!: string;

  @ApiProperty({
    description: '1 paddon og‘irligi (kg), satr ko‘rinishida',
    type: String,
    example: '1250.5',
  })
  weightPerPallet!: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'Kartada ko‘rsatiladigan birinchi surat. Butun media ro‘yxati ' +
      '`GET /products/:slug` da keladi.',
    example: '/uploads/products/lyuks-1.jpg',
    nullable: true,
  })
  primaryImageUrl!: string | null;

  @ApiProperty({
    enum: PublicAvailability,
    description:
      '🔒 FAQAT ikki holat. Ombordagi aniq son hech qachon berilmaydi ' +
      '(TZ 3.2). Uch rangli indikator (🟢🟡🔴) auth bor joyda — optom ' +
      'mijoz kabinetida va admin panelida.',
    example: PublicAvailability.AVAILABLE,
  })
  availability!: PublicAvailability;
}
