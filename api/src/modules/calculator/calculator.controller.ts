import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentActor } from '../../auth/decorators';
import {
  CustomerOnlyGuard,
  JwtAuthGuard,
  PasswordChangeRequiredGuard,
} from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import {
  DeliveryRequestDto,
  DeliveryResponseDto,
  QuoteRequestDto,
  QuoteResponseDto,
} from './dto';
import { QuoteService } from './quote.service';

/**
 * Kalkulyator (B-027, TZ 3.3) — faqat ko'rsatish, hech narsa saqlanmaydi.
 *
 * 🔒 Faqat optom mijoz: kalkulyator narx ko'rsatadi, narx esa filialga va
 *    mijozga bog'liq. Mehmon ham, xodim ham kira olmaydi.
 */
@ApiTags(SwaggerTag.Calculator)
@Controller('calculator')
@UseGuards(JwtAuthGuard, CustomerOnlyGuard, PasswordChangeRequiredGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiUnauthorizedResponse({
  description: 'Token yo‘q, muddati o‘tgan yoki hisob faol emas',
  type: ApiErrorDto,
})
@ApiForbiddenResponse({
  description:
    'Optom mijoz tokeni emas yoki vaqtinchalik parol almashtirilmagan',
  type: ApiErrorDto,
})
export class CalculatorController {
  constructor(private readonly quotes: QuoteService) {}

  @Post('quote')
  @HttpCode(200)
  @ApiOperation({
    summary: 'To‘liq hisob: mahsulotlar + yo‘l kira',
    description:
      'Paddon soni bo‘yicha m², og‘irlik, summa; `regionId` + ' +
      '`transportTypeId` berilsa — nechta transport va yo‘l kira.\n\n' +
      '🔒 Narx va filial so‘rovdan OLINMAYDI: narx — mijoz filialining ' +
      'narxi, shaxsiy chegirmasi bilan; filial — tokendan.\n\n' +
      'Buyurtma berilganda summa AYNAN shu yo‘l bilan qayta hisoblanadi.',
  })
  @ApiDataResponse(QuoteResponseDto, { description: 'Hisob natijasi' })
  @ApiBadRequestResponse({
    description:
      'Paddon soni noto‘g‘ri, mahsulot takrorlangan, viloyat/transport ' +
      'faqat bittasi berilgan yoki summa juda katta',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Mahsulot filialda sotilmaydi yoki bu yo‘nalishga tarif yo‘q',
    type: ApiErrorDto,
  })
  quote(
    @CurrentActor() actor: Actor,
    @Body() dto: QuoteRequestDto,
  ): Promise<QuoteResponseDto> {
    return this.quotes.quote(actor, dto.items, {
      regionId: dto.regionId,
      transportTypeId: dto.transportTypeId,
    });
  }

  @Post('delivery')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Faqat yo‘l kira',
    description:
      '"Yo‘l kira hisoblash" tugmasi uchun (TZ 3.3): jami paddon, viloyat ' +
      'va transport turi bo‘yicha nechta transport va qancha turadi.',
  })
  @ApiDataResponse(DeliveryResponseDto, { description: 'Yo‘l kira' })
  @ApiNotFoundResponse({
    description: 'Bu yo‘nalishga tarif yo‘q',
    type: ApiErrorDto,
  })
  delivery(
    @CurrentActor() actor: Actor,
    @Body() dto: DeliveryRequestDto,
  ): Promise<DeliveryResponseDto> {
    return this.quotes.deliveryOnly(actor, dto);
  }
}
