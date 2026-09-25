import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { AnnouncementAudience } from '../../../common/enums';

/** Bir xabarda tanlanadigan mijozlar chegarasi. */
export const MAX_ANNOUNCEMENT_RECIPIENTS = 1000;
export const DEFAULT_ANNOUNCEMENT_TITLE = 'Vodiy Kafel';

/**
 * `multipart/form-data` da massiv satr bo'lib keladi: JSON (`["a","b"]`),
 * vergul bilan (`a,b`) yoki takrorlangan maydon (`customerIds=a&customerIds=b`).
 */
const toIdList = ({ value }: { value: unknown }): unknown => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (text === '') return [];
  if (text.startsWith('[')) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return value;
    }
  }
  return text
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
};

/**
 * Mijozlarga oddiy xabar (T-009) — `multipart/form-data`.
 *
 * Rasm (`image`) ixtiyoriy, bitta: JPG/PNG/WEBP, 10 MB gacha. Kabinetda
 * rasm USTIDA, matn uning OSTIDA ko'rsatiladi.
 */
export class CreateAnnouncementDto {
  @ApiPropertyOptional({
    maxLength: 120,
    example: 'Navro‘z muborak!',
    description: `Sarlavha. Berilmasa — "${DEFAULT_ANNOUNCEMENT_TITLE}".`,
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiProperty({
    maxLength: 2000,
    example: 'Hurmatli mijozlar, bayram munosabati bilan…',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;

  @ApiProperty({
    enum: AnnouncementAudience,
    description:
      '`ALL` — doirangizdagi barcha faol mijozlar (menejerda — faqat ' +
      'o‘zingizga biriktirilganlar); `SELECTED` — `customerIds`.',
  })
  @IsEnum(AnnouncementAudience)
  audience!: AnnouncementAudience;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Faqat `SELECTED` da. multipart da JSON massiv, vergul bilan yoki ' +
      'takrorlangan maydon.',
  })
  // Bo'sh / yo'q ro'yxat — servisda BITTA aniq xabar bilan (bu yerda
  // tekshirilsa, besh xil validator xabari birdaniga chiqardi).
  @Transform(toIdList)
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ANNOUNCEMENT_RECIPIENTS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  customerIds?: string[];

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Rasm (ixtiyoriy): JPG/PNG/WEBP, 10 MB gacha',
  })
  image?: unknown;
}

export class AnnouncementQueryDto extends PaginationQueryDto {}

export class AnnouncementSenderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Bosh admin' })
  fullName!: string;
}

export class AnnouncementDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Navro‘z muborak!' })
  title!: string;

  @ApiProperty()
  body!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  imageUrl!: string | null;

  @ApiProperty({ enum: AnnouncementAudience })
  audience!: AnnouncementAudience;

  @ApiProperty({ example: 42, description: 'Nechta mijozga yuborildi' })
  recipientCount!: number;

  @ApiProperty({ type: AnnouncementSenderDto })
  createdBy!: AnnouncementSenderDto;

  @ApiProperty({ type: Date })
  createdAt!: Date;
}
