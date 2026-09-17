import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OrderStatus, PaymentStatus } from '../../../common/enums';
import { toOptionalBoolean } from '../../../common/utils/query-boolean.util';
import {
  AccountSummaryDto,
  AccountTransactionAdminDto,
} from '../../accounts/dto';
import { CreatePricingRuleDto } from '../../pricing/dto';

const PHONE_PATTERN = /^\+?[\d\s()-]{9,25}$/;
const LOGIN_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const INN_PATTERN = /^\d{9}$/;

// — So'rovlar —

export class AdminCustomerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Login, kompaniya, kontakt shaxs, telefon yoki INN bo‘yicha',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: '`true` — qarzdorlar (balans > 0); `false` — qarzi yo‘qlar',
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  hasDebt?: boolean;

  @ApiPropertyOptional({ description: 'Faqat SUPER_ADMIN uchun ma’noli' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class CreateCustomerDto {
  @ApiProperty({
    example: 'fargona-qurilish',
    description:
      'Kirish logini: 3–64 belgi, lotin harf/raqam va `.` `_` `-`. ' +
      'Kichik harfga keltiriladi; noyob.',
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @Matches(LOGIN_PATTERN, {
    message:
      'Login 3–64 belgi: lotin harf, raqam, nuqta, pastki chiziq yoki tire',
  })
  login!: string;

  @ApiProperty({ example: '"Qurilish Invest" MChJ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  companyName!: string;

  @ApiPropertyOptional({
    type: String,
    example: '301234567',
    nullable: true,
    description: 'INN — 9 raqam (Didox.uz shartnomalari uchun kerak bo‘ladi)',
  })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @Matches(INN_PATTERN, { message: 'INN 9 ta raqamdan iborat bo‘lishi kerak' })
  inn?: string | null;

  @ApiProperty({ example: 'Aliyev Vali' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  contactName!: string;

  @ApiProperty({ example: '+998901234567' })
  @IsString()
  @Matches(PHONE_PATTERN, { message: 'Telefon raqami noto‘g‘ri' })
  phone!: string;

  @ApiPropertyOptional({
    description:
      'Filial. Filial xodimi uchun e’tiborsiz — har doim O‘Z filiali ' +
      '(boshqasi berilsa 404). SUPER_ADMIN uchun MAJBURIY.',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Biriktiriladigan xodim (shu filialning faol menejeri/admini). ' +
      'Berilmasa va yaratuvchi menejer bo‘lsa — o‘zi biriktiriladi.',
  })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  managerId?: string | null;

  @ApiPropertyOptional({
    type: [CreatePricingRuleDto],
    maxItems: 50,
    description:
      '🆕 (TZ 3.14) Maxsus narxlar — mijoz bilan BIRGA yaratiladi (bittasi ' +
      'xato bo‘lsa mijoz ham yaratilmaydi). Bo‘sh — bazaviy filial narxi.\n\n' +
      'Qoidalar `POST /admin/customers/{id}/pricing-rules` bilan bir xil ' +
      'tekshiriladi (filial admini — faqat foizli chegirma, chegaragacha; ' +
      'menejer/moderator qoida bera olmaydi — 403).',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CreatePricingRuleDto)
  pricingRules?: CreatePricingRuleDto[];
}

export class UpdateCustomerDto extends PartialType(
  OmitType(CreateCustomerDto, ['login', 'pricingRules'] as const),
) {}

export class SetCustomerActiveDto {
  @ApiProperty({
    description:
      '`false` — mijoz kira olmaydi va buyurtma bera olmaydi (tarix saqlanadi)',
  })
  @IsDefined()
  @IsBoolean()
  isActive!: boolean;
}

// — Javoblar —

export class CustomerRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Vodiy Kafel — Farg‘ona' })
  name!: string;
}

export class CustomerStaffRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Farg‘ona menejeri' })
  fullName!: string;
}

export class AdminCustomerListItemDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'fargona-qurilish' })
  login!: string;

  @ApiProperty()
  companyName!: string;

  @ApiProperty({ type: String, nullable: true })
  inn!: string | null;

  @ApiProperty()
  contactName!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty({ type: CustomerRefDto })
  branch!: CustomerRefDto;

  @ApiProperty({ type: CustomerStaffRefDto, nullable: true })
  manager!: CustomerStaffRefDto | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({
    description: '`true` — mijoz hali vaqtinchalik parolni almashtirmagan',
  })
  mustChangePassword!: boolean;

  @ApiProperty({
    example: '3369600',
    description: 'Qarz (musbat) yoki avans (manfiy)',
  })
  balance!: string;

  @ApiProperty({ type: Date })
  createdAt!: Date;
}

export class CustomerOrderSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'VK-2026-000001' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ example: '11369600' })
  grandTotal!: string;

  @ApiProperty({ enum: PaymentStatus, nullable: true })
  paymentStatus!: PaymentStatus | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;
}

export class AdminCustomerDetailDto extends OmitType(AdminCustomerListItemDto, [
  'balance',
] as const) {
  @ApiProperty({ type: CustomerStaffRefDto, description: 'Kim yaratgan' })
  createdBy!: CustomerStaffRefDto;

  @ApiProperty({ type: Date })
  updatedAt!: Date;

  @ApiProperty({ type: AccountSummaryDto })
  account!: AccountSummaryDto;

  @ApiProperty({
    type: [CustomerOrderSummaryDto],
    description: 'Oxirgi 10 ta buyurtma (to‘liq ro‘yxat — GET /admin/orders)',
  })
  recentOrders!: CustomerOrderSummaryDto[];

  @ApiProperty({
    type: [AccountTransactionAdminDto],
    description:
      'Oxirgi 10 ta hisob harakati (to‘liq — GET /admin/customers/{id}/transactions)',
  })
  recentTransactions!: AccountTransactionAdminDto[];
}

export class CustomerCreatedResponseDto {
  @ApiProperty({ type: AdminCustomerDetailDto })
  customer!: AdminCustomerDetailDto;

  @ApiProperty({
    description:
      'Vaqtinchalik parol — FAQAT SHU javobda ko‘rinadi. Mijozga telefon ' +
      'yoki Telegram orqali yetkazing; birinchi kirishda almashtiradi.',
    example: 'Kp7mQx4rTn92',
  })
  temporaryPassword!: string;
}
