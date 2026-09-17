import { ApiProperty, OmitType } from '@nestjs/swagger';
import { StockStatus } from '../../../common/enums';
import { ProductDetailResponseDto } from './product-detail.response.dto';
import { ProductListItemResponseDto } from './product-public.response.dto';

/**
 * Optom mijoz kabinetidagi mahsulot kartasi (B-064, TZ 3.7.1).
 *
 * Ochiq kartaning AYNAN o'zi, ikki farq bilan:
 *   • `pricePerSqm` — mijozga tegishli YAKUNIY narx qo'shiladi
 *   • `availability` (ikki holat) `stockStatus` (uch holat) bilan
 *     ALMASHTIRILADI — mijoz «kam qoldi» ni ko'rishi kerak (TZ 3.2)
 *
 * 🔒 JAVOBDA YO'Q VA BO'LMAYDI:
 *   • zaxiraning ANIQ SONI — faqat holat (CLAUDE.md qoida 2)
 *   • chegirmaning SABABI: qaysi qoida ishlagani, bazaviy narx, foiz —
 *     hech biri (qoida 11, TZ 3.3.1). Mijoz faqat yakuniy raqamni biladi
 *   • filial ID/nomi — mijoz o'z filialini `GET /me/profile` dan oladi;
 *     bu yerda takrorlanmaydi va boshqa filial narxi hech qachon kelmaydi
 */
export class CustomerCatalogItemDto extends OmitType(
  ProductListItemResponseDto,
  ['availability'] as const,
) {
  @ApiProperty({
    description:
      'Mijozga tegishli YAKUNIY narx (1 m² uchun, so‘m). Narx zanjiri ' +
      'bo‘yicha hisoblangan: mijoz+mahsulot > mijoz+zavod > mijoz umumiy ' +
      '> filialning bazaviy narxi.\n\n' +
      '⚠ Satr ko‘rinishida (CLAUDE.md qoida 7) — `Number()` ga ' +
      'aylantirilmaydi.\n\n' +
      '🔒 Qaysi qoida ishlagani va bazaviy narx JAVOBDA YO‘Q.',
    type: String,
    example: '85000.00',
  })
  pricePerSqm!: string;

  @ApiProperty({
    enum: StockStatus,
    description:
      'Uch rangli zaxira holati (🟢 IN_STOCK / 🟡 LOW / 🔴 OUT_OF_STOCK). ' +
      'Chegara — mahsulotning o‘z `lowStockThreshold` i, u bo‘lmasa global ' +
      'sozlama (`stock.lowThresholdPallets`).\n\n' +
      '🔒 Ombordagi aniq son hech qachon berilmaydi (TZ 3.2).',
    example: StockStatus.IN_STOCK,
  })
  stockStatus!: StockStatus;
}

/**
 * Kabinetdagi mahsulot sahifasi — karta + tavsif va butun media ro'yxati.
 *
 * ⚠ `similar` (o'xshash mahsulotlar) bu yerda YO'Q: u ochiq katalogning
 *   alohida endpointida (`GET /products/:slug/similar`) va narx
 *   ko'rsatmaydi. Kabinetda kerak bo'lsa — alohida task.
 */
export class CustomerCatalogDetailDto extends OmitType(
  ProductDetailResponseDto,
  ['availability'] as const,
) {
  @ApiProperty({
    description: 'Mijozga tegishli yakuniy narx (1 m² uchun, so‘m)',
    type: String,
    example: '85000.00',
  })
  pricePerSqm!: string;

  @ApiProperty({
    enum: StockStatus,
    description: 'Uch rangli zaxira holati',
    example: StockStatus.IN_STOCK,
  })
  stockStatus!: StockStatus;
}
