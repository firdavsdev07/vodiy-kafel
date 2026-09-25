import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  OrderingType,
  OrderSource,
  OrderStatus,
  PaymentStatus,
} from '../../../common/enums';
import { toOptionalBoolean } from '../../../common/utils/query-boolean.util';
import { CreateOrderDto } from './create-order.dto';
import {
  OrderCustomerResponseDto,
  OrderPaymentDto,
} from './order.response.dto';
import { OrderStatusAdminEntryDto, StaffRefDto } from './order-status.dto';

export class AdminOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: OrderSource })
  @IsOptional()
  @IsEnum(OrderSource)
  source?: OrderSource;

  @ApiPropertyOptional({ description: 'Faqat tezkor (`true`) yoki oddiy' })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isUrgent?: boolean;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    description: 'Shu holatdagi to‘lovi bor buyurtmalar',
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({
    description:
      'Filial filtri — SUPER_ADMIN uchun. Boshqa rol o‘zinikidan boshqasini ' +
      'bersa — 404.',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({
    description: 'Yaratilgan sana (UTC) — shu kundan boshlab, kiritiladi',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Yaratilgan sana (UTC) — shu kungacha, KIRITILMAYDI',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Buyurtma raqami, kompaniya nomi, telefon yoki mijoz ismi',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class BranchNameRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Vodiy Kafel — Andijon' })
  name!: string;
}

export class OrderBuyerDto {
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'Hisobi bor mijoz. Hisobsiz xaridorda — null',
  })
  customerId!: string | null;

  @ApiProperty({ example: 'Andijon Qurilish MChJ' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  contactName!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: '+998901234567',
  })
  phone!: string | null;
}

export class AdminOrderListItemDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'VK-2026-000001' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ enum: OrderSource })
  source!: OrderSource;

  @ApiProperty({ enum: OrderingType })
  orderingType!: OrderingType;

  @ApiProperty({ example: false })
  isUrgent!: boolean;

  @ApiPropertyOptional({ type: BranchNameRefDto, nullable: true })
  branch!: BranchNameRefDto | null;

  @ApiPropertyOptional({
    type: OrderBuyerDto,
    nullable: true,
    description: 'Filial ta’minot buyurtmasida — null',
  })
  buyer!: OrderBuyerDto | null;

  @ApiPropertyOptional({ type: StaffRefDto, nullable: true })
  manager!: StaffRefDto | null;

  @ApiProperty({ example: 10 })
  totalPallets!: number;

  @ApiProperty({ type: String, example: '1123200' })
  grandTotal!: string;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    nullable: true,
    description: 'Oxirgi to‘lov holati',
  })
  paymentStatus!: PaymentStatus | null;

  @ApiProperty({ example: '2026-09-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class AdminOrderPaymentDto extends OrderPaymentDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  providerRef!: string | null;
}

/** Buyurtma — ADMIN ko'rinishi (B-030). */
export class AdminOrderDetailDto extends OmitType(OrderCustomerResponseDto, [
  'statusHistory',
  'payments',
] as const) {
  @ApiProperty({ enum: OrderingType })
  orderingType!: OrderingType;

  @ApiProperty({ example: false })
  isUrgent!: boolean;

  @ApiPropertyOptional({ type: BranchNameRefDto, nullable: true })
  branch!: BranchNameRefDto | null;

  @ApiPropertyOptional({
    type: BranchNameRefDto,
    nullable: true,
    description: 'T-004: jo‘natiladigan CENTRAL ombor (moderator belgilaydi).',
  })
  dispatchBranch!: BranchNameRefDto | null;

  @ApiPropertyOptional({ type: OrderBuyerDto, nullable: true })
  buyer!: OrderBuyerDto | null;

  @ApiPropertyOptional({ type: StaffRefDto, nullable: true })
  manager!: StaffRefDto | null;

  @ApiProperty({ type: [AdminOrderPaymentDto] })
  payments!: AdminOrderPaymentDto[];

  @ApiProperty({ type: [OrderStatusAdminEntryDto] })
  statusHistory!: OrderStatusAdminEntryDto[];

  @ApiProperty({ enum: OrderStatus, isArray: true })
  allowedNextStatuses!: OrderStatus[];
}

export class SetOrderUrgentDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isUrgent!: boolean;
}

export class AssignOrderManagerDto {
  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Shu buyurtma filialining faol xodimi. `null` — biriktirishni olib tashlash.',
  })
  // `null` — ruxsat etilgan (olib tashlash); maydon umuman yo'qligi — 400.
  @ValidateIf((dto: AssignOrderManagerDto) => dto.managerId !== null)
  @IsString()
  @IsNotEmpty()
  managerId!: string | null;
}

/** Qo'lda kiritiladigan buyurtma manbalari — sayt manbasi mijozniki. */
export const MANUAL_ORDER_SOURCES = [
  OrderSource.PHONE,
  OrderSource.TELEGRAM,
  OrderSource.ADMIN,
] as const;

/**
 * Menejer qo'lda kiritgan buyurtma (B-030) — telefon/Telegram orqali.
 *
 * Xaridor: `customerId` (hisobi bor optom mijoz) YOKI `guestName` +
 * `guestPhone` (hisobsiz). 🔒 Narx baribir backendda: mijoz bo'lsa — uning
 * filiali narxi va shaxsiy qoidalari, hisobsiz xaridorda — filial bazaviy
 * narxi.
 */
export class CreateManualOrderDto extends CreateOrderDto {
  @ApiProperty({ enum: MANUAL_ORDER_SOURCES, example: OrderSource.PHONE })
  @IsIn(MANUAL_ORDER_SOURCES)
  source!: (typeof MANUAL_ORDER_SOURCES)[number];

  @ApiPropertyOptional({
    description: 'Hisobi bor optom mijoz. Berilsa — guestName/guestPhone yo‘q.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerId?: string;

  @ApiPropertyOptional({ maxLength: 150, example: 'Aziz aka' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  guestName?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s()-]{9,25}$/, { message: 'Telefon raqami noto‘g‘ri' })
  guestPhone?: string;

  @ApiPropertyOptional({
    description:
      'Hisobsiz xaridor uchun filial — faqat SUPER_ADMIN beradi. Xodim ' +
      'uchun har doim o‘z filiali; mijozda — mijozning filiali.',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiPropertyOptional({
    description:
      'Yetkazib berish viloyati — `transportTypeId` bilan BIRGA; yo‘l kira ' +
      'darhol hisoblanadi.\n\n🔒 T-004: faqat MODERATOR va SUPER_ADMIN. ' +
      'Filial xodimi yuborsa — 403 (u faqat `deliveryRequested` beradi, ' +
      'yo‘nalishni keyin moderator belgilaydi).',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  regionId?: string;
}

/**
 * Buyurtmaning yetkazib berishini belgilash (T-004) — MODERATOR / SUPER_ADMIN.
 *
 * `regionId` + `transportTypeId` BIRGA: yo'l kira tarif va mijoz qoidalari
 * bo'yicha qayta hisoblanadi. Ikkalasi `null` — olib ketish (yo'l kira 0).
 * Maydon umuman berilmasa — o'zgarmaydi.
 */
export class SetOrderDeliveryDto {
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'Jo‘natiladigan CENTRAL ombor. `null` — tozalash.',
  })
  @IsOptional()
  @ValidateIf((dto: SetOrderDeliveryDto) => dto.dispatchBranchId !== null)
  @IsString()
  @IsNotEmpty()
  dispatchBranchId?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @ValidateIf((dto: SetOrderDeliveryDto) => dto.regionId !== null)
  @IsString()
  @IsNotEmpty()
  regionId?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @ValidateIf((dto: SetOrderDeliveryDto) => dto.transportTypeId !== null)
  @IsString()
  @IsNotEmpty()
  transportTypeId?: string | null;
}
