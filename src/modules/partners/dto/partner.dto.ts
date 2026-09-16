import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalInt,
} from '../../../common/utils/query-boolean.util';

const WEBSITE_URL = { protocols: ['http', 'https'], require_protocol: true };

export class PartnerAdminQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

/** Logotip bilan birga keladigan maydonlar (multipart — hammasi satr). */
export class CreatePartnerDto {
  @ApiProperty({ example: 'Knauf', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({ example: 'https://knauf.uz' })
  @IsOptional()
  @IsUrl(WEBSITE_URL, { message: 'websiteUrl — to‘liq havola (https://…)' })
  @MaxLength(300)
  websiteUrl?: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Transform(toOptionalInt)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/** Swagger uchun multipart sxemasi. */
export class CreatePartnerBodyDto extends CreatePartnerDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Logotip: JPG, PNG yoki WEBP, 10 MB gacha',
  })
  file!: unknown;
}

export class UploadPartnerLogoBodyDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Yangi logotip: JPG, PNG yoki WEBP, 10 MB gacha',
  })
  file!: unknown;
}

/** JSON tahrir. Logotip — alohida `POST /admin/partners/:id/logo`. */
export class UpdatePartnerDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: '`null` — havolani olib tashlash',
  })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsUrl(WEBSITE_URL, { message: 'websiteUrl — to‘liq havola (https://…)' })
  @MaxLength(300)
  websiteUrl?: string | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ description: '`false` — sahifada yashirish' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PartnerPublicDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Knauf' })
  name!: string;

  @ApiProperty({ example: '/uploads/partners/0b6f1c1e.png' })
  logoUrl!: string;

  @ApiProperty({ type: String, nullable: true })
  websiteUrl!: string | null;
}

export class PartnerAdminDto extends PartnerPublicDto {
  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}
