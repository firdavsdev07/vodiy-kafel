import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OrderStatus, PaymentMethod } from '../../../common/enums';
import {
  MAX_QUOTE_ITEMS,
  QuoteItemDto,
} from '../../calculator/dto/calculator.dto';

/**
 * Buyurtma berish (B-028, TZ 3.4).
 *
 * 🔒 NARX, SUMMA, FILIAL — bu yerda YO'Q (CLAUDE.md qoida 1 va 5). Frontend
 *    faqat TANLOV yuboradi: mahsulot, paddon, yo'nalish, to'lov usuli.
 *    Summa backendda kalkulyator (B-027) bilan AYNAN bir yo'l orqali qayta
 *    hisoblanadi; ortiqcha maydonlarni ValidationPipe tashlab yuboradi.
 */
export class CreateOrderDto {
  @ApiProperty({ type: [QuoteItemDto], minItems: 1, maxItems: MAX_QUOTE_ITEMS })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_QUOTE_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];

  @ApiPropertyOptional({
    default: false,
    description:
      'T-004: yetkazib berish kerakmi. `false` — olib ketish.\n\n' +
      '⚠ Mijoz VILOYATNI TANLAMAYDI: yo‘nalish (viloyat + transport) va ' +
      'yo‘l kirani buyurtmadan keyin MODERATOR / SUPER_ADMIN belgilaydi ' +
      '(`PATCH /admin/orders/{id}/delivery`). Shungacha yo‘l kira 0 va ' +
      'javobda `deliveryPending: true`.',
  })
  @IsOptional()
  @IsBoolean()
  deliveryRequested?: boolean;

  @ApiPropertyOptional({
    description:
      'Afzal ko‘rilgan transport turi — faqat `deliveryRequested` bilan. ' +
      'Narxga ta’sir qilmaydi: yakuniy transportni admin belgilaydi.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  transportTypeId?: string;

  @ApiPropertyOptional({
    description:
      'Xaritada belgilangan aniq nuqta (TZ 3.13) — `exactLng` bilan birga, ' +
      'faqat yetkazib berishda (`deliveryRequested`). ⚠ Narxga TA’SIR ' +
      'QILMAYDI — faqat logistika.',
    minimum: -90,
    maximum: 90,
    example: 41.311081,
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  exactLat?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180, example: 69.240562 })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  exactLng?: number;

  @ApiProperty({
    enum: PaymentMethod,
    description:
      '`CASH` — naqd, `CARD` — karta orqali onlayn, `BANK_TRANSFER` — ' +
      'shartnoma bo‘yicha o‘tkazma',
  })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CustomerOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
