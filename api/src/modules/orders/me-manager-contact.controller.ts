import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
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
import { ManagerContactDto } from './dto';
import { OrdersService } from './orders.service';

/**
 * Optom mijoz kabineti — «Menejer bilan aloqa» (T-006).
 *
 * Buyurtmaga bog'liq emas: mijoz buyurtma bermasdan ham kimga murojaat
 * qilishini bilsin. Buyurtma bo'yicha variant — `GET /orders/{id}/manager-contact`.
 */
@ApiTags(SwaggerTag.Customers)
@Controller('me/manager-contact')
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
export class MeManagerContactController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Mening menejerim va filialim',
    description:
      'Biriktirilgan menejer (ism, telefon, Telegram) — yo‘q bo‘lsa ' +
      '`manager: null`; filial aloqasi (telefonlar, manzil, ish vaqti) DOIM.',
  })
  @ApiDataResponse(ManagerContactDto, { description: 'Aloqa ma’lumoti' })
  get(@CurrentActor() actor: Actor): Promise<ManagerContactDto> {
    return this.orders.myManagerContact(actor);
  }
}
