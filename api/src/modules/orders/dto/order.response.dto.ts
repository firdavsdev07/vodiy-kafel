import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  OrderSource,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../../common/enums';

export class OrderItemResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  productId!: string;

  @ApiProperty({ example: 'Lyuks Granit Bej' })
  productName!: string;

  @ApiProperty({ example: 'lyuks-granit-bej' })
  productSlug!: string;

  @ApiProperty({ example: 10 })
  pallets!: number;

  @ApiProperty({ type: String, example: '14.4' })
  sqm!: string;

  @ApiProperty({ type: String, example: '325' })
  weightKg!: string;

  @ApiProperty({
    type: String,
    example: '78000',
    description:
      'Buyurtma paytidagi narx (surat). Keyin narx o‘zgarsa ham bu qiymat ' +
      'o‘zgarmaydi.',
  })
  pricePerSqm!: string;

  @ApiProperty({ type: String, example: '1123200' })
  lineTotal!: string;
}

export class OrderStatusEntryDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.NEW })
  status!: OrderStatus;

  @ApiPropertyOptional({ nullable: true, type: String })
  note!: string | null;

  @ApiProperty({ example: '2026-09-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class OrderPaymentDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ enum: PaymentMethod })
  method!: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @ApiProperty({ type: String, example: '1123200' })
  amount!: string;

  @ApiPropertyOptional({ nullable: true, type: Date })
  paidAt!: Date | null;
}

export class OrderDeliveryDto {
  @ApiProperty({ example: 'Toshkent shahri' })
  regionName!: string;

  @ApiProperty({ example: 'Fura' })
  transportTypeName!: string;

  @ApiProperty({ example: 2 })
  vehicleCount!: number;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 41.311081 })
  exactLat!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 69.240562 })
  exactLng!: number | null;
}

/**
 * Buyurtma — OPTOM MIJOZ ko'rinishi (B-028, B-031).
 *
 * 🔒 Ichki maydonlar YO'Q: menejer/xodim ID lari, status kim tomonidan
 *    o'zgartirilgani, narx qoidasi sababi.
 */
export class OrderCustomerResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'VK-2026-000001' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.NEW })
  status!: OrderStatus;

  @ApiProperty({ enum: OrderSource, example: OrderSource.WEBSITE })
  source!: OrderSource;

  @ApiProperty({ example: 'Vodiy Kafel — Farg‘ona' })
  branchName!: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ example: 10 })
  totalPallets!: number;

  @ApiProperty({ type: String, example: '14.4' })
  totalSqm!: string;

  @ApiProperty({ type: String, example: '325' })
  totalWeightKg!: string;

  @ApiProperty({ type: String, example: '1123200' })
  itemsTotal!: string;

  @ApiProperty({ type: String, example: '0' })
  deliveryTotal!: string;

  @ApiProperty({ type: String, example: '1123200' })
  grandTotal!: string;

  @ApiPropertyOptional({
    type: OrderDeliveryDto,
    nullable: true,
    description:
      'Yo‘nalish belgilangan yetkazib berish. Olib ketishda ham, yo‘nalish ' +
      'hali belgilanmaganda ham (`deliveryPending`) — `null`.',
  })
  delivery!: OrderDeliveryDto | null;

  @ApiProperty({
    example: true,
    description: 'T-004: yetkazib berish so‘ralgan (`false` — olib ketish).',
  })
  deliveryRequested!: boolean;

  @ApiProperty({
    example: false,
    description:
      'T-004: yetkazib berish so‘ralgan, lekin yo‘nalish va yo‘l kirani ' +
      'moderator hali belgilamagan — `deliveryTotal` hozircha 0.',
  })
  deliveryPending!: boolean;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'Fura',
    description:
      'Mijoz afzal ko‘rgan transport (narxga ta’sir qilmaydi). Yo‘nalish ' +
      'belgilangach HAQIQIY transport — `delivery` da.',
  })
  requestedTransportTypeName!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Number,
    example: 40.386,
    description: 'Xaritadagi nuqta — yo‘nalish belgilanmagan bo‘lsa ham.',
  })
  exactLat!: number | null;

  @ApiPropertyOptional({ nullable: true, type: Number, example: 71.786 })
  exactLng!: number | null;

  @ApiProperty({ type: [OrderPaymentDto] })
  payments!: OrderPaymentDto[];

  @ApiProperty({
    type: [OrderStatusEntryDto],
    description: 'Holatlar tarixi — vaqt belgisi bilan (TZ 3.4)',
  })
  statusHistory!: OrderStatusEntryDto[];

  @ApiPropertyOptional({ nullable: true, type: String })
  note!: string | null;

  @ApiProperty({ example: '2026-09-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class CustomerOrderListItemDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'VK-2026-000001' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ example: 2, description: 'Mahsulot qatorlari soni' })
  itemCount!: number;

  @ApiProperty({ example: 10 })
  totalPallets!: number;

  @ApiProperty({ type: String, example: '1123200' })
  grandTotal!: string;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'Toshkent shahri',
    description: 'Olib ketishda — null',
  })
  regionName!: string | null;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    nullable: true,
    description: 'Oxirgi to‘lov holati',
  })
  paymentStatus!: PaymentStatus | null;

  @ApiProperty({ example: '2026-09-14T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({
    example: '2026-09-14T12:00:00.000Z',
    description: 'Oxirgi o‘zgarish — holat yangilanganini bilish uchun',
  })
  updatedAt!: Date;
}

/** Buyurtma menejeri bilan bog'lanish (B-043, TZ 3.12). */
/** Aloqa qilinadigan xodim (T-006). */
export class ContactPersonDto {
  @ApiProperty({ example: 'Farg‘ona menejeri' })
  fullName!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '+998900220001',
    description: 'T-006: qo‘ng‘iroq qilish uchun.',
  })
  phone!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://t.me/vk_fargona',
    description:
      'Telegram havolasi; username yo‘q yoki noto‘g‘ri bo‘lsa — `null`',
  })
  telegramUrl!: string | null;
}

/** Filial aloqasi — menejer yo'q bo'lsa ham mijoz kimgadir murojaat qila olsin. */
export class BranchContactDto {
  @ApiProperty({ example: 'Vodiy Kafel — Farg‘ona' })
  name!: string;

  @ApiProperty({ type: [String], example: ['+998911296666'] })
  phones!: string[];

  @ApiProperty({ example: 'Farg‘ona shahri, Mustaqillik 12' })
  address!: string;

  @ApiProperty({ example: 'Du–Sh 09:00–18:00' })
  workingHours!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  telegramUrl!: string | null;
}

/**
 * «Menejer bilan aloqa» (B-043, T-006).
 *
 * T-006: avval faqat menejer ismi + Telegram qaytardi va menejer
 * biriktirilmagan bo'lsa 404 berardi — mijoz hech narsa ko'rmasdi. Endi
 * menejer (buyurtmaniki, bo'lmasa mijozniki) telefoni bilan, bo'lmasa
 * `null`; filial aloqasi esa DOIM bor.
 */
export class ManagerContactDto {
  @ApiPropertyOptional({
    type: ContactPersonDto,
    nullable: true,
    description:
      'Biriktirilgan menejer; yo‘q bo‘lsa — `null` (filialga murojaat).',
  })
  manager!: ContactPersonDto | null;

  @ApiProperty({ type: BranchContactDto })
  branch!: BranchContactDto;
}
