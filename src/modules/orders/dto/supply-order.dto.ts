import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OrderStatus, PaymentStatus } from '../../../common/enums';
import { QuoteItemDto } from '../../calculator/dto';
import { OrderCustomerResponseDto } from './order.response.dto';

/**
 * Filial → markaziy ombor ta'minot buyurtmasi (B-058, TZ 3.7.2).
 *
 * 🔒 Narx/summa yo'q — markaziy ombor narxi backendda (qoida 1). To'lov
 *    usuli yo'q — ichki hisob-kitob (BANK_TRANSFER).
 */
export class CreateSupplyOrderDto {
  @ApiProperty({ type: [QuoteItemDto], minItems: 1, maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];

  @ApiPropertyOptional({
    description:
      'Yetkazib berish: `transportTypeId` bilan birga; yo‘q — olib ketish',
  })
  @IsOptional()
  @IsString()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transportTypeId?: string;

  @ApiPropertyOptional({
    description:
      'Markaziy ombor. Faol markaziy ombor bitta bo‘lsa — shart emas; bir ' +
      'nechta bo‘lsa — majburiy.',
  })
  @IsOptional()
  @IsString()
  centralBranchId?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class SupplyOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Faqat markaz ro‘yxatida: buyurtma bergan filial',
  })
  @IsOptional()
  @IsString()
  orderingBranchId?: string;
}

export class SupplyBranchRefDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Vodiy Kafel — Farg‘ona' })
  name!: string;
}

export class SupplyOrderResponseDto extends OrderCustomerResponseDto {
  @ApiProperty({
    type: SupplyBranchRefDto,
    description: 'Buyurtma bergan do‘kon filiali',
  })
  orderingBranch!: SupplyBranchRefDto;

  @ApiProperty({
    type: [String],
    enum: OrderStatus,
    description: 'Markaz xodimi uchun keyingi holat tugmalari',
  })
  allowedNextStatuses!: OrderStatus[];
}

export class SupplyOrderListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'VK-2026-000010' })
  orderNumber!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ type: SupplyBranchRefDto })
  orderingBranch!: SupplyBranchRefDto;

  @ApiProperty({ type: SupplyBranchRefDto, description: 'Markaziy ombor' })
  centralBranch!: SupplyBranchRefDto;

  @ApiProperty({ example: 40 })
  totalPallets!: number;

  @ApiProperty({ example: '4760000' })
  grandTotal!: string;

  @ApiProperty({ enum: PaymentStatus, nullable: true })
  paymentStatus!: PaymentStatus | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: Date })
  updatedAt!: Date;
}
