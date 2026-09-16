import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { toOptionalBoolean } from '../../../common/utils/query-boolean.util';
import { IsPositiveDecimalString } from '../../../common/validators/decimal-string';

// — Ma'lumotnomalar: transport turi va viloyat —

export class ReferenceQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class CreateTransportTypeDto {
  @ApiProperty({ example: 'Fura', maxLength: 60, description: 'Noyob' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @ApiProperty({
    example: 20,
    minimum: 1,
    maximum: 1000,
    description:
      'Bitta transportga sig‘adigan paddon. O‘zgarsa — faqat YANGI ' +
      'hisoblarga ta’sir qiladi (buyurtmada mashina soni surat).',
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  capacityPallets!: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateTransportTypeDto extends PartialType(
  CreateTransportTypeDto,
) {
  @ApiPropertyOptional({ description: '`false` — tanlovda ko‘rinmaydi' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateRegionDto {
  @ApiProperty({
    example: 'Toshkent shahri',
    maxLength: 100,
    description: 'Noyob',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateRegionDto extends PartialType(CreateRegionDto) {
  @ApiPropertyOptional({ description: '`false` — tanlovda ko‘rinmaydi' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TransportTypeAdminDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Fura' })
  name!: string;

  @ApiProperty({ example: 20 })
  capacityPallets!: number;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}

export class RegionAdminDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Toshkent shahri' })
  name!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}

// — Tariflar —

export class TariffQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Filtr. Filial xodimi uchun faqat o‘z filiali (boshqasi — 404)',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transportTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertTariffDto {
  @ApiPropertyOptional({
    description:
      'SUPER_ADMIN uchun majburiy. Filial admini bermasa — o‘z filiali; ' +
      'boshqasini bersa — 404.',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  regionId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  transportTypeId!: string;

  @ApiProperty({
    example: '12000000',
    description: 'Bitta transport uchun yo‘l kira, so‘m. Satr.',
  })
  @IsPositiveDecimalString(12, 2)
  price!: string;

  @ApiPropertyOptional({
    description: 'Yangi yozuvda berilmasa — `true`; mavjudida — o‘zgarmaydi',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTariffPriceDto {
  @ApiProperty({ example: '12500000' })
  @IsPositiveDecimalString(12, 2)
  price!: string;
}

export class TariffRefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}

export class TariffTransportRefDto extends TariffRefDto {
  @ApiProperty({ example: 20 })
  capacityPallets!: number;
}

export class TariffAdminDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ type: TariffRefDto })
  branch!: TariffRefDto;

  @ApiProperty({ type: TariffRefDto })
  region!: TariffRefDto;

  @ApiProperty({ type: TariffTransportRefDto })
  transportType!: TariffTransportRefDto;

  @ApiProperty({ example: '12000000' })
  price!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}
