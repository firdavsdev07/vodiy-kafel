import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

/** Bitta qatordagi paddonlar chegarasi (Postgres `integer` dan ancha past). */
export const MAX_PALLETS_PER_ITEM = 100_000;
export const MAX_QUOTE_ITEMS = 50;

export class QuoteItemDto {
  @ApiProperty({ description: 'Mahsulot ID' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({
    description: 'Paddon soni (kv² emas — TZ 3.3)',
    minimum: 1,
    maximum: MAX_PALLETS_PER_ITEM,
    example: 10,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_PALLETS_PER_ITEM)
  pallets!: number;
}

/**
 * 🔒 Bu yerda NARX ham, FILIAL ham YO'Q va bo'lmaydi: narx bazadan olinadi,
 *    filial tokendan (CLAUDE.md qoida 1 va 5). Yuborilgan `price`,
 *    `branchId` kabi maydonlarni ValidationPipe jimgina tashlab yuboradi.
 */
export class QuoteRequestDto {
  @ApiProperty({
    type: [QuoteItemDto],
    minItems: 1,
    maxItems: MAX_QUOTE_ITEMS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_QUOTE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];

  @ApiPropertyOptional({
    description: 'Yetkazib berish viloyati. `transportTypeId` bilan BIRGA.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  regionId?: string;

  @ApiPropertyOptional({
    description:
      'Transport turi. `regionId` bilan BIRGA. Ikkalasi ham ' +
      'berilmasa — yetkazib berishsiz hisob.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  transportTypeId?: string;
}

export class DeliveryRequestDto {
  @ApiProperty({ minimum: 1, example: 25 })
  @IsInt()
  @Min(1)
  @Max(MAX_PALLETS_PER_ITEM * MAX_QUOTE_ITEMS)
  totalPallets!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  regionId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  transportTypeId!: string;
}

export class QuoteItemResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  productId!: string;

  @ApiProperty({ example: 'Lyuks Granit Bej' })
  name!: string;

  @ApiProperty({ example: 10 })
  pallets!: number;

  @ApiProperty({ type: String, example: '14.4', description: 'Jami m²' })
  sqm!: string;

  @ApiProperty({ type: String, example: '325', description: 'Jami kg' })
  weightKg!: string;

  @ApiProperty({
    type: String,
    example: '76500',
    description:
      'Shu mijoz uchun YAKUNIY narx (so‘m/m²). Chegirma bo‘lsa — allaqachon ' +
      'qo‘llangan; qanday hisoblangani ko‘rsatilmaydi.',
  })
  pricePerSqm!: string;

  @ApiProperty({ type: String, example: '1101600' })
  lineTotal!: string;

  @ApiProperty({
    example: true,
    description:
      'T-005: markaziy omborda so‘ralgan paddon BORMI. `false` bo‘lsa ' +
      'buyurtma 409 bilan rad etiladi — kamroq kiriting.\n\n' +
      '🔒 Aniq zaxira soni qaytarilmaydi (CLAUDE.md qoida 2) — faqat ' +
      '"yetadi / yetmaydi".',
  })
  enoughStock!: boolean;
}

export class DeliveryResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  transportTypeId!: string;

  @ApiProperty({ example: 'Fura' })
  transportTypeName!: string;

  @ApiProperty({ example: 'Toshkent shahri' })
  regionName!: string;

  @ApiProperty({ example: 20 })
  capacityPallets!: number;

  @ApiProperty({ description: 'Nechta transport kerak', example: 2 })
  vehicleCount!: number;

  @ApiProperty({
    type: String,
    example: '12000000',
    description: 'Bitta transport uchun yakuniy yo‘l kira',
  })
  unitPrice!: string;

  @ApiProperty({ type: String, example: '24000000' })
  total!: string;
}

export class QuoteResponseDto {
  @ApiProperty({ type: [QuoteItemResponseDto] })
  items!: QuoteItemResponseDto[];

  @ApiProperty({
    example: false,
    description: 'T-005: kamida bitta mahsulotga zaxira yetmaydi.',
  })
  stockShortage!: boolean;

  @ApiProperty({ example: 15 })
  totalPallets!: number;

  @ApiProperty({ type: String, example: '19.8' })
  totalSqm!: string;

  @ApiProperty({ type: String, example: '445' })
  totalWeightKg!: string;

  @ApiProperty({ type: String, example: '1558800' })
  itemsTotal!: string;

  @ApiPropertyOptional({
    type: DeliveryResponseDto,
    nullable: true,
    description: 'Yetkazib berishsiz hisobda — `null`',
  })
  transport!: DeliveryResponseDto | null;

  @ApiProperty({ type: String, example: '12000000' })
  deliveryTotal!: string;

  @ApiProperty({ type: String, example: '13558800' })
  grandTotal!: string;
}
