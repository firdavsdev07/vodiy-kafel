import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { LeadStatus } from '../../../common/enums';

/** Mehmonga javob — faqat ma'lumotnoma raqami, boshqa hech narsa. */
export class LeadCreatedDto {
  @ApiProperty({
    example: 'VK-7H2K9Q',
    description:
      'Ma’lumotnoma — mehmon qo‘ng‘iroq qilganda aytadi, xodim panelda ' +
      'shu bo‘yicha topadi.',
  })
  reference!: string;
}

export class LeadAdminQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({
    description:
      'Filial bo‘yicha (SUPER_ADMIN / MODERATOR). Filial xodimiga ' +
      'e’tiborsiz — har doim o‘z filiali; boshqasi → 404.',
  })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Ism, telefon yoki ma’lumotnoma (`VK-…`) bo‘yicha qidiruv',
    maxLength: 100,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 1000,
    description: 'Ichki izoh (mehmonga ko‘rinmaydi). `null` — o‘chirish.',
  })
  @IsOptional()
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}

class LeadBranchDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Farg‘ona' })
  name!: string;
}

class LeadHandlerDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Aliyev Vali' })
  fullName!: string;
}

export class LeadAdminDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'VK-7H2K9Q' })
  reference!: string;

  @ApiProperty({ example: 'Aziz' })
  name!: string;

  @ApiProperty({ example: '+998901234567' })
  phone!: string;

  @ApiProperty()
  message!: string;

  @ApiProperty({ enum: LeadStatus })
  status!: LeadStatus;

  @ApiProperty({ type: String, nullable: true })
  note!: string | null;

  @ApiProperty({
    type: LeadBranchDto,
    nullable: true,
    description: '`null` — mehmon do‘kon tanlamagan',
  })
  branch!: LeadBranchDto | null;

  @ApiProperty({
    type: LeadHandlerDto,
    nullable: true,
    description: 'Holatni oxirgi o‘zgartirgan xodim',
  })
  handledBy!: LeadHandlerDto | null;

  @ApiProperty({ type: Date, nullable: true })
  handledAt!: Date | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}

export class LeadNewCountDto {
  @ApiProperty({ example: 3, description: 'Doiradagi `NEW` murojaatlar' })
  count!: number;
}
