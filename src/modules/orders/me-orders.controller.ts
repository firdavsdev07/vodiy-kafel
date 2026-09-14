import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import {
  CustomerOrderListItemDto,
  CustomerOrderQueryDto,
  OrderCustomerResponseDto,
} from './dto';
import { OrdersService } from './orders.service';

const PaginatedCustomerOrders = PaginatedResponseDto(CustomerOrderListItemDto);

/**
 * Optom mijoz kabineti — buyurtmalar (B-031).
 *
 * ⚠ Chakana mijozda kabinet yo'q — faqat B2B tokeni.
 */
@ApiTags(SwaggerTag.Customers)
@Controller('me/orders')
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
export class MeOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Mening buyurtmalarim',
    description: 'Yangilari birinchi. Holat bo‘yicha filtr.',
  })
  @ApiDataResponse(PaginatedCustomerOrders, { description: 'Sahifalangan' })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: CustomerOrderQueryDto,
  ): Promise<PaginatedResult<CustomerOrderListItemDto>> {
    return this.orders.findMine(actor, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buyurtma tafsiloti',
    description:
      'Tarkib (buyurtma paytidagi narx bilan), to‘lovlar, holatlar tarixi ' +
      'vaqt belgisi bilan.\n\n' +
      '🔒 Faqat o‘z buyurtmasi — begonasi 404.',
  })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(OrderCustomerResponseDto, { description: 'Buyurtma' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  findOne(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<OrderCustomerResponseDto> {
    return this.orders.findMineOne(actor, id);
  }
}
