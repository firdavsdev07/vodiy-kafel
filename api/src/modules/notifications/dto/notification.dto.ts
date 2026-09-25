import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { NotificationType } from '../../../common/enums';
import { toOptionalBoolean } from '../../../common/utils/query-boolean.util';

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: '`false` — faqat o‘qilmaganlar; `true` — faqat o‘qilganlar',
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isRead?: boolean;
}

export class NotificationDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ enum: NotificationType })
  type!: NotificationType;

  @ApiProperty({ example: 'Buyurtma: Yo‘lda' })
  title!: string;

  @ApiProperty({ example: 'VK-2026-000007 — Yo‘lda.' })
  body!: string;

  @ApiProperty({
    type: Object,
    nullable: true,
    example: { orderId: 'cmtz0a1b2c3d4e5f6g7h8i9j' },
    description:
      'Bosilganda qayerga o‘tish: `orderId`, `paymentId` yoki `productId`',
  })
  payload!: Record<string, unknown> | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '/uploads/announcements/abc.webp',
    description:
      'T-009: xabar rasmi (nisbiy `/uploads/...`). Kabinetda rasm USTIDA, ' +
      'matn uning OSTIDA ko‘rsatiladi.',
  })
  imageUrl!: string | null;

  @ApiProperty()
  isRead!: boolean;

  @ApiProperty({ type: Date, nullable: true, description: 'UTC' })
  readAt!: Date | null;

  @ApiProperty({ type: Date, description: 'UTC' })
  createdAt!: Date;
}

export class UnreadCountDto {
  @ApiProperty({ example: 3 })
  count!: number;
}

export class ReadAllResponseDto {
  @ApiProperty({ example: 3, description: 'O‘qilgan deb belgilanganlar soni' })
  updated!: number;
}
