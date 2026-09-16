import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
  CreateOrderDto,
  ManagerContactDto,
  OrderCustomerResponseDto,
} from './dto';
import { OrdersService } from './orders.service';

/**
 * Buyurtmalar — optom mijoz (B-028).
 *
 * ⚠ Chakana mijoz buyurtma bermaydi (hisob yo'q). Telefon/Telegram orqali
 *   kelgan buyurtmani menejer admin panelidan kiritadi (B-030).
 */
@ApiTags(SwaggerTag.Orders)
@Controller('orders')
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
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Buyurtma berish',
    description:
      'Mahsulotlar (paddon bilan), ixtiyoriy yetkazib berish (viloyat + ' +
      'transport), to‘lov usuli.\n\n' +
      '🔒 Summa backendda QAYTA hisoblanadi — `POST /calculator/quote` bilan ' +
      'aynan bir xil yo‘l. Frontend yuborgan narx/summa e’tiborga olinmaydi.\n\n' +
      'Omborda yetarli bo‘lmasa — 409 (qancha borligi aytilmaydi).\n\n' +
      'Natija: `NEW` holatdagi buyurtma va `PENDING` to‘lov yozuvi.',
  })
  @ApiDataResponse(OrderCustomerResponseDto, {
    status: 201,
    description: 'Buyurtma yaratildi',
  })
  @ApiBadRequestResponse({
    description:
      'Paddon/mahsulot noto‘g‘ri, viloyat va transport birga emas, ' +
      'koordinatalar noto‘liq yoki olib ketishda berilgan',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Mahsulot filialda sotilmaydi yoki tarif yo‘q',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Omborda yetarli emas',
    type: ApiErrorDto,
  })
  create(
    @CurrentActor() actor: Actor,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderCustomerResponseDto> {
    return this.orders.create(actor, dto);
  }

  @Get(':id/manager-contact')
  @ApiOperation({
    summary: 'Buyurtma menejeri bilan bog‘lanish',
    description:
      'Menejer ismi va Telegram havolasi (TZ 3.12). Faqat o‘z buyurtmasi.',
  })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(ManagerContactDto, { description: 'Menejer' })
  @ApiNotFoundResponse({
    description: 'Buyurtma topilmadi yoki menejer hali biriktirilmagan',
    type: ApiErrorDto,
  })
  managerContact(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<ManagerContactDto> {
    return this.orders.managerContact(actor, id);
  }
}
