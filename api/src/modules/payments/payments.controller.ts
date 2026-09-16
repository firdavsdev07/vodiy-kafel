import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
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
  PaymentStatusResponseDto,
  StartPaymentDto,
  StartPaymentResponseDto,
} from './dto';
import { PaymentsService } from './payments.service';

/**
 * To'lov — optom mijoz (B-034).
 *
 * 🔒 Faqat o'z buyurtmasi va to'lovi: begonasi — 404 (qoida 6).
 */
@ApiTags(SwaggerTag.Payments)
@Controller()
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
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('orders/:id/payment')
  @HttpCode(200)
  @ApiOperation({
    summary: 'To‘lovni boshlash / usulini tanlash',
    description:
      '**CARD** — onlayn to‘lov ochiladi, javobda `qrPayload` (QR ni ' +
      'frontend chizadi). Keyin `GET /payments/{id}/status` bilan holat ' +
      'kuzatiladi.\n\n' +
      '**CASH / BANK_TRANSFER** — `qrPayload: null`; to‘lov tushganini ' +
      'admin tasdiqlaydi.\n\n' +
      '🔒 Summa so‘ralmaydi — buyurtmaning backendda hisoblangan summasi.\n\n' +
      'Qayta chaqirish xavfsiz: o‘sha usulda kutilayotgan to‘lov bo‘lsa, ' +
      'yangisi ochilmaydi. Boshqa usul tanlansa — eski to‘lov almashtiriladi.',
  })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(StartPaymentResponseDto, {
    description: 'Kutilayotgan to‘lov',
  })
  @ApiBadRequestResponse({
    description: 'To‘lov usuli noto‘g‘ri',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'Buyurtma topilmadi', type: ApiErrorDto })
  @ApiConflictResponse({
    description:
      'Buyurtma bekor qilingan, allaqachon to‘langan yoki parallel so‘rov',
    type: ApiErrorDto,
  })
  start(
    @CurrentActor() actor: Actor,
    @Param('id') orderId: string,
    @Body() dto: StartPaymentDto,
  ): Promise<StartPaymentResponseDto> {
    return this.payments.start(actor, orderId, dto);
  }

  @Get('payments/:id/status')
  @ApiOperation({
    summary: 'To‘lov holati',
    description:
      'QR ko‘rsatilgan sahifada davriy so‘raladi (masalan har 3–5 soniyada) ' +
      '— `PAID` bo‘lguncha.',
  })
  @ApiParam({ name: 'id', description: 'To‘lov ID' })
  @ApiDataResponse(PaymentStatusResponseDto, { description: 'Holat' })
  @ApiNotFoundResponse({ description: 'To‘lov topilmadi', type: ApiErrorDto })
  getStatus(
    @CurrentActor() actor: Actor,
    @Param('id') paymentId: string,
  ): Promise<PaymentStatusResponseDto> {
    return this.payments.getStatus(actor, paymentId);
  }
}
