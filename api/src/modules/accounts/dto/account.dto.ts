import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AccountTransactionType } from '../../../common/enums';
import { IsNonZeroDecimalString } from '../../../common/validators/decimal-string';

export class AccountSummaryDto {
  @ApiProperty({
    example: '11369600',
    description: 'Jami qarzga yozilgan (buyurtmalar + musbat tuzatishlar)',
  })
  totalPurchased!: string;

  @ApiProperty({
    example: '8000000',
    description: 'Jami to‘langan (to‘lovlar + manfiy tuzatishlar)',
  })
  totalPaid!: string;

  @ApiProperty({
    example: '3369600',
    description:
      'Qarz = totalPurchased − totalPaid. Musbat — mijoz qarzdor; ' +
      'manfiy — avans (ortiqcha to‘lov)',
  })
  balance!: string;
}

export class AccountTransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AccountTransactionType })
  @IsOptional()
  @IsEnum(AccountTransactionType)
  type?: AccountTransactionType;
}

export class AccountTransactionDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ enum: AccountTransactionType })
  type!: AccountTransactionType;

  @ApiProperty({
    example: '-8000000',
    description:
      'ISHORALI: musbat — qarz oshdi (DEBT), manfiy — kamaydi (PAYMENT); ' +
      'tuzatish ikki tomonga',
  })
  amount!: string;

  @ApiProperty({ type: String, nullable: true })
  orderId!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'VK-2026-000001' })
  orderNumber!: string | null;

  @ApiProperty({ type: String, nullable: true })
  note!: string | null;

  @ApiProperty({ type: Date, description: 'UTC' })
  createdAt!: Date;
}

export class AccountStaffRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Farg‘ona admini' })
  fullName!: string;
}

export class AccountTransactionAdminDto extends AccountTransactionDto {
  @ApiProperty({ type: String, nullable: true })
  paymentId!: string | null;

  @ApiProperty({
    type: AccountStaffRefDto,
    nullable: true,
    description: 'Qo‘lda kiritgan xodim; avtomatik yozuvda `null`',
  })
  createdBy!: AccountStaffRefDto | null;
}

export class CreateAccountTransactionDto {
  @ApiProperty({
    enum: AccountTransactionType,
    description:
      'DEBT — qarz qo‘shish; PAYMENT — buyurtmadan tashqari to‘lov qabul ' +
      'qilindi; ADJUSTMENT — tuzatish (xato yozuvni qaytarish ham shu)',
  })
  @IsEnum(AccountTransactionType)
  type!: AccountTransactionType;

  @ApiProperty({
    example: '150000',
    description:
      'So‘m, satr. DEBT va PAYMENT — MUSBAT (ishorani backend qo‘yadi). ' +
      'ADJUSTMENT — ishorali: `"150000"` qarzni oshiradi, `"-150000"` ' +
      'kamaytiradi.',
  })
  @IsNonZeroDecimalString(12, 2)
  amount!: string;

  @ApiProperty({
    minLength: 3,
    maxLength: 500,
    description: 'Sabab — MAJBURIY (audit: nega qo‘lda o‘zgartirildi)',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  note!: string;
}
