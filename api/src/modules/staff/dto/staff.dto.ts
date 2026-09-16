import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../../../common/enums';
import { toOptionalBoolean } from '../../../common/utils/query-boolean.util';

/**
 * Telefon — xodimning LOGINI: kirishda aynan shu satr solishtiriladi,
 * shuning uchun bo'sh joy/qavssiz, faqat raqamlar (boshida `+` mumkin).
 */
const LOGIN_PHONE = /^\+?\d{9,15}$/;
/** Telegram username: 5–32, lotin harf/raqam/`_`; `@` bilan ham qabul qilinadi. */
const TELEGRAM_USERNAME = /^@?[A-Za-z0-9_]{5,32}$/;

const stripAt = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/^@/, '') : value;

export class StaffQueryDto {
  @ApiPropertyOptional({
    description: 'Filtr. Filial admini uchun faqat o‘z filiali (boshqasi 404)',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Ism, telefon yoki Telegram' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CreateStaffDto {
  @ApiProperty({ example: 'Aliyev Vali', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({
    example: '+998901234567',
    description: 'Kirish logini — noyob, faqat raqamlar (boshida + mumkin)',
  })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(LOGIN_PHONE, {
    message: 'Telefon faqat raqamlardan (9–15), boshida + bo‘lishi mumkin',
  })
  phone!: string;

  @ApiPropertyOptional({
    example: 'vk_fargona',
    nullable: true,
    description: 'Mijoz bilan bog‘lanish havolasi uchun (TZ 3.12)',
  })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @Transform(stripAt)
  @Matches(TELEGRAM_USERNAME, {
    message: 'Telegram username: 5–32 lotin harf, raqam yoki _',
  })
  telegramUsername?: string | null;

  @ApiPropertyOptional({
    description:
      'Filial. Filial admini uchun e’tiborsiz — har doim O‘Z filiali ' +
      '(boshqasi 404). SUPER_ADMIN uchun majburiy.',
  })
  @IsOptional()
  @IsString()
  branchId?: string;
}

export class UpdateStaffDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Matches(LOGIN_PHONE, {
    message: 'Telefon faqat raqamlardan (9–15), boshida + bo‘lishi mumkin',
  })
  phone?: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @Transform(stripAt)
  @Matches(TELEGRAM_USERNAME, {
    message: 'Telegram username: 5–32 lotin harf, raqam yoki _',
  })
  telegramUsername?: string | null;

  @ApiPropertyOptional({
    description: 'Boshqa filialga o‘tkazish — faqat SUPER_ADMIN',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: '`false` — kira olmaydi, yangi buyurtmalar biriktirilmaydi',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StaffBranchRefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Vodiy Kafel — Farg‘ona' })
  name!: string;
}

export class StaffDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ example: '+998901234567' })
  phone!: string;

  @ApiProperty({ type: String, nullable: true })
  telegramUsername!: string | null;

  @ApiProperty({ enum: [UserRole.MANAGER, UserRole.MODERATOR] })
  role!: UserRole;

  @ApiProperty({ type: StaffBranchRefDto })
  branch!: StaffBranchRefDto;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}

export class StaffCreatedDto {
  @ApiProperty({ type: StaffDto })
  staff!: StaffDto;

  @ApiProperty({
    example: 'Kp7mQx4rTn92',
    description:
      'Vaqtinchalik parol — FAQAT SHU javobda. Xodimga shaxsan yetkazing.',
  })
  temporaryPassword!: string;
}
