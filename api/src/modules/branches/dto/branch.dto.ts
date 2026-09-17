import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { BranchType } from '../../../common/enums';
import { toOptionalBoolean } from '../../../common/utils/query-boolean.util';

const PHONE_PATTERN = /^\+?[\d\s()-]{9,25}$/;
const HTTPS_URL = { protocols: ['https'], require_protocol: true };

// — So'rovlar —

export class CreateBranchDto {
  @ApiProperty({
    enum: BranchType,
    description:
      'RETAIL — do‘kon (narx saqlaydi, saytda ko‘rinadi); CENTRAL — markaziy ' +
      'ombor (zaxira, moderator; saytda ko‘rinmaydi). Keyin o‘zgarmaydi.',
  })
  @IsEnum(BranchType)
  type!: BranchType;

  @ApiProperty({ example: 'Vodiy Kafel — Farg‘ona', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiProperty({ example: 'Farg‘ona', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: 'Mustaqillik ko‘chasi 12, bozor yonida' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address!: string;

  @ApiProperty({ example: 40.3864, minimum: -90, maximum: 90 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @ApiProperty({ example: 71.7864, minimum: -180, maximum: 180 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude!: number;

  @ApiProperty({ example: 'Du–Sh 09:00–18:00', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  workingHours!: string;

  @ApiProperty({
    type: [String],
    example: ['+998 73 244 00 00'],
    minItems: 1,
    maxItems: 5,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @Matches(PHONE_PATTERN, {
    each: true,
    message: 'Telefon raqami noto‘g‘ri',
  })
  phones!: string[];

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://t.me/vodiykafel_fargona',
  })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUrl(HTTPS_URL, { message: 'telegramUrl — https:// havola bo‘lishi kerak' })
  @MaxLength(300)
  telegramUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://instagram.com/vodiykafel',
  })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUrl(HTTPS_URL, {
    message: 'instagramUrl — https:// havola bo‘lishi kerak',
  })
  @MaxLength(300)
  instagramUrl?: string | null;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateBranchDto extends PartialType(
  OmitType(CreateBranchDto, ['type'] as const),
) {
  @ApiPropertyOptional({
    description: 'Faqat SUPER_ADMIN. `false` — filial yopiladi (soft delete)',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BranchAdminQueryDto {
  @ApiPropertyOptional({ enum: BranchType })
  @IsOptional()
  @IsEnum(BranchType)
  type?: BranchType;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UploadBranchImageBodyDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Bino surati: JPG/PNG/WEBP, 10 MB gacha',
  })
  file!: unknown;
}

// — Javoblar —

export class BranchPublicDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Vodiy Kafel — Farg‘ona' })
  name!: string;

  @ApiProperty({ example: 'Farg‘ona' })
  city!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty({ example: 40.3864 })
  latitude!: number;

  @ApiProperty({ example: 71.7864 })
  longitude!: number;

  @ApiProperty({ example: 'Du–Sh 09:00–18:00' })
  workingHours!: string;

  @ApiProperty({ type: [String] })
  phones!: string[];

  @ApiProperty({ type: String, nullable: true })
  buildingImageUrl!: string | null;

  @ApiProperty({ type: String, nullable: true })
  telegramUrl!: string | null;

  @ApiProperty({ type: String, nullable: true })
  instagramUrl!: string | null;
}

export class BranchAdminDto extends BranchPublicDto {
  @ApiProperty({ enum: BranchType })
  type!: BranchType;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}
