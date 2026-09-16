import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaymentMethod, PaymentStatus } from '../../../common/enums';

export class StartPaymentDto {
  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CARD,
    description:
      'CARD — onlayn (QR qaytadi); CASH / BANK_TRANSFER — admin ' +
      'to‘lov tushganini qo‘lda tasdiqlaydi',
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;
}

export class StartPaymentResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  paymentId!: string;

  @ApiProperty({ enum: PaymentMethod })
  method!: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @ApiProperty({
    example: '1123200',
    description: 'So‘m, satr. Backendda hisoblangan — buyurtma summasi',
  })
  amount!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Faqat CARD: QR kod uchun matn — frontend o‘zi chizadi. ' +
      'Naqd/o‘tkazmada `null`',
  })
  qrPayload!: string | null;
}

export class PaymentStatusResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  paymentId!: string;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ type: Date, nullable: true, description: 'UTC' })
  paidAt!: Date | null;
}

export class ConfirmPaymentDto {
  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Izoh (masalan kvitansiya raqami) — hisob tarixiga yoziladi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class AdminPaymentResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  orderId!: string;

  @ApiProperty({ example: 'VK-2026-000001' })
  orderNumber!: string;

  @ApiProperty({ enum: PaymentMethod })
  method!: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty({ example: '1123200' })
  amount!: string;

  @ApiProperty({ type: Date, nullable: true, description: 'UTC' })
  paidAt!: Date | null;
}
