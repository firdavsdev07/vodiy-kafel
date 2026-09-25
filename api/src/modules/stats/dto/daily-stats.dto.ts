import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

/** Eng uzun davr — 12 oylik tezkor tugma + chegara kunlari. */
export const MAX_DAILY_STATS_DAYS = 370;

/**
 * Kunlik statistika davri (T-010). Sana VA SOAT bilan: masalan
 * `2026-09-25T09:00:00+05:00` → `2026-09-26T18:00:00+05:00`. Chart kunlar
 * bo'yicha, soat faqat davr chegarasini aniqlaydi.
 */
export class DailyStatsQueryDto {
  @ApiProperty({
    example: '2026-09-18T00:00:00+05:00',
    description: 'Davr boshi (shu daqiqa KIRADI), ISO 8601',
  })
  @IsISO8601({ strict: true })
  from!: string;

  @ApiProperty({
    example: '2026-09-25T23:59:59+05:00',
    description: 'Davr oxiri (shu daqiqa KIRMAYDI), ISO 8601',
  })
  @IsISO8601({ strict: true })
  to!: string;

  @ApiPropertyOptional({
    description:
      'Filial bo‘yicha — SUPER_ADMIN va MODERATOR uchun; filial xodimi ' +
      'har doim o‘z filialini ko‘radi',
  })
  @IsOptional()
  @IsString()
  branchId?: string;
}

/** Bitta kun (yoki davrning jami) ko'rsatkichlari. */
export class DailyStatsValuesDto {
  @ApiProperty({
    example: 4,
    description: 'Yangi buyurtmalar (bekor qilinganlari bilan)',
  })
  ordersCount!: number;

  @ApiProperty({
    type: String,
    example: '12500000',
    description: 'Buyurtmalar summasi — bekor QILINMAGANLARI (so‘m)',
  })
  ordersTotal!: string;

  @ApiProperty({
    example: 1,
    description: 'Shu kuni berilib, hozir bekor qilingan',
  })
  cancelledCount!: number;

  @ApiProperty({
    example: 2,
    description: 'Shu kuni berilib, hozir yetkazilgan',
  })
  deliveredCount!: number;

  @ApiProperty({
    type: String,
    example: '8000000',
    description: 'Shu kuni TUSHGAN to‘lovlar (PAID, `paidAt` bo‘yicha)',
  })
  paymentsTotal!: string;

  @ApiProperty({ example: 1, description: 'Yangi optom mijozlar' })
  newCustomers!: number;
}

export class DailyStatsDayDto extends DailyStatsValuesDto {
  @ApiProperty({
    example: '2026-09-25',
    description: 'Toshkent kuni (YYYY-MM-DD)',
  })
  date!: string;
}

export class DailyStatsDto {
  @ApiProperty({ type: Date, description: 'Davr boshi (UTC)' })
  from!: Date;

  @ApiProperty({ type: Date, description: 'Davr oxiri (UTC)' })
  to!: Date;

  @ApiProperty({
    example: 'Asia/Tashkent',
    description: 'Kunlar shu vaqt bo‘yicha',
  })
  timezone!: string;

  @ApiProperty({
    type: [DailyStatsDayDto],
    description: 'Davrdagi HAR kun — bo‘sh kunlar ham (nol bilan)',
  })
  days!: DailyStatsDayDto[];

  @ApiProperty({ type: DailyStatsValuesDto, description: 'Butun davr jami' })
  totals!: DailyStatsValuesDto;
}
