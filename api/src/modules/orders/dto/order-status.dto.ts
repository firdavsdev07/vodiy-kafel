import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { OrderStatus, UserRole } from '../../../common/enums';

export class ChangeOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.SEARCHING_TRANSPORT })
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @ApiPropertyOptional({
    maxLength: 500,
    description: 'Izoh — mijoz holatlar tarixida ko‘radi',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class StaffRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Farg‘ona menejeri' })
  fullName!: string;
}

/**
 * Buyurtmaga biriktirish uchun nomzod xodim (B-062).
 *
 * `StaffRefDto` dan farqi — `role`: UI "menejer" va "filial admini" ni
 * ajratib ko'rsatishi kerak, aks holda ro'yxatda bir xil ismlar
 * yonma-yon turadi va kim kim ekani bilinmaydi.
 */
export class AssignableStaffDto extends StaffRefDto {
  @ApiProperty({
    enum: [UserRole.MANAGER, UserRole.BRANCH_ADMIN, UserRole.MODERATOR],
    description:
      'Xodim roli. Biriktirish uchun aynan shu uch rol qabul qilinadi ' +
      '(`PATCH /admin/orders/{id}/assign` bilan bitta manba).',
  })
  role!: UserRole;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'vk_fargona',
    description: 'Mijoz bilan bog‘lanish havolasi uchun (TZ 3.12)',
  })
  telegramUsername!: string | null;
}

export class OrderStatusAdminEntryDto {
  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiPropertyOptional({ nullable: true, type: String })
  note!: string | null;

  @ApiPropertyOptional({
    type: StaffRefDto,
    nullable: true,
    description: 'Kim o‘zgartirgan (tizim/mijoz — null)',
  })
  changedBy!: StaffRefDto | null;

  @ApiProperty({ example: '2026-09-14T10:00:00.000Z' })
  createdAt!: Date;
}

export class OrderStatusChangeResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'VK-2026-000001' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({
    enum: OrderStatus,
    isArray: true,
    description: 'Shu holatdan keyin ruxsat etilgan holatlar (tugmalar uchun)',
  })
  allowedNextStatuses!: OrderStatus[];

  @ApiProperty({ type: [OrderStatusAdminEntryDto] })
  statusHistory!: OrderStatusAdminEntryDto[];
}

export class TrackOrderQueryDto {
  @ApiProperty({
    description:
      'Buyurtma egasining telefoni. Bo‘sh joy, qavs va tire farq qilmaydi.',
    example: '+998 90 123 45 67',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[\d\s()-]{7,25}$/, { message: 'Telefon raqami noto‘g‘ri' })
  phone!: string;
}

export class TrackStatusEntryDto {
  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ example: '2026-09-14T10:00:00.000Z' })
  createdAt!: Date;
}

/**
 * Ochiq kuzatuv — 🔒 summa, narx, mahsulot tarkibi, izohlar YO'Q: faqat
 * holat va vaqt.
 */
export class TrackOrderResponseDto {
  @ApiProperty({ example: 'VK-2026-000001' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ type: [TrackStatusEntryDto] })
  statusHistory!: TrackStatusEntryDto[];

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    example: 'Toshkent shahri',
    description: 'Olib ketishda — null',
  })
  regionName!: string | null;

  @ApiProperty({ example: '2026-09-14T10:00:00.000Z' })
  createdAt!: Date;
}
