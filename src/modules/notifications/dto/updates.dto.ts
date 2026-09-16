import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';
import { OrderStatus, PaymentStatus } from '../../../common/enums';
import { NotificationDto } from './notification.dto';

export class UpdatesQueryDto {
  @ApiPropertyOptional({
    example: '2026-09-16T09:30:00.000Z',
    description:
      'Oldingi javobdagi `serverTime`. Berilmasa (birinchi chaqiriq) — ' +
      'ro‘yxatlar bo‘sh, faqat `unreadCount` va `serverTime`.',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  since?: string;
}

export class OrderUpdateDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'VK-2026-000007' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ enum: PaymentStatus, nullable: true })
  paymentStatus!: PaymentStatus | null;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}

export class UpdatesResponseDto {
  @ApiProperty({
    type: [OrderUpdateDto],
    description:
      'Holati yoki to‘lovi o‘zgargan buyurtmalar (qisqa). Tafsilot kerak ' +
      'bo‘lsa — buyurtmani alohida so‘rang.',
  })
  orders!: OrderUpdateDto[];

  @ApiProperty({
    type: [NotificationDto],
    description: 'Yangi bildirishnomalar',
  })
  notifications!: NotificationDto[];

  @ApiProperty({ example: 2 })
  unreadCount!: number;

  @ApiProperty({
    description:
      '`true` — o‘zgarishlar juda ko‘p, ro‘yxat kesildi: sahifani to‘liq ' +
      'yangilang (masalan uzoq offline qolingandan keyin).',
  })
  truncated!: boolean;

  @ApiProperty({
    type: Date,
    description: 'Keyingi so‘rovda `since` sifatida yuboring (UTC)',
  })
  serverTime!: Date;
}
