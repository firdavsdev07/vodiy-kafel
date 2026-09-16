import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsIn, ValidateIf } from 'class-validator';
import { SETTING_KEYS, type SettingKey } from '../setting-definitions';

const VALUE_DESCRIPTION =
  'Kalitga qarab turi har xil:\n' +
  '• `stock.lowThresholdPallets` — butun son ≥ 0\n' +
  '• `payment.requisites` — `{ bank, mfo (5 raqam), account (20 raqam), ' +
  'inn (9 raqam), name }` yoki `null`\n' +
  '• `pricing.branchAdminMaxDiscountPercent` — 0…100';

export class SettingPublicDto {
  @ApiProperty({ enum: SETTING_KEYS, example: 'payment.requisites' })
  key!: SettingKey;

  @ApiProperty({
    description: VALUE_DESCRIPTION,
    example: {
      bank: 'Hamkorbank',
      mfo: '00873',
      account: '20208000900123456789',
      inn: '301234567',
      name: 'Vodiy Kafel Savdo MChJ',
    },
  })
  value!: unknown;
}

export class SettingAdminDto extends SettingPublicDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  description!: string | null;

  @ApiProperty({
    description: '`GET /settings/public` da ko‘rinadimi',
    example: true,
  })
  isPublic!: boolean;

  @ApiProperty({
    description:
      '`true` — bazada yozuv yo‘q, `value` tizimning standart qiymati. ' +
      'Birinchi saqlashda yozuv yaratiladi.',
    example: false,
  })
  isDefault!: boolean;

  @ApiPropertyOptional({ nullable: true, type: Date })
  updatedAt!: Date | null;
}

export class UpdateSettingDto {
  @ApiProperty({ enum: SETTING_KEYS })
  @IsIn(SETTING_KEYS, { message: 'Noma’lum sozlama kaliti' })
  key!: SettingKey;

  @ApiProperty({ description: VALUE_DESCRIPTION, example: 25 })
  // `null` — ruxsat etilgan qiymat (rekvizitlarni tozalash), faqat maydon
  // umuman yo'qligi rad etiladi. Turni kalitning sxemasi tekshiradi.
  @ValidateIf((dto: UpdateSettingDto) => dto.value !== null)
  @IsDefined({ message: 'value majburiy' })
  value!: unknown;
}
