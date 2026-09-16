import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
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
} from '@nestjs/swagger';
import { CurrentActor, Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import {
  ChangeOrderStatusDto,
  OrderStatusChangeResponseDto,
  SupplyOrderListItemDto,
  SupplyOrderQueryDto,
  SupplyOrderResponseDto,
} from './dto';
import { SupplyOrdersService } from './supply-orders.service';

const PaginatedSupplyOrders = PaginatedResponseDto(SupplyOrderListItemDto);

/**
 * Markaziy omborga kelgan ta'minot buyurtmalari (B-058).
 *
 * 🔒 MODERATOR — faqat o'z markaziy ombori (B-051); SUPER_ADMIN — hammasi.
 */
@ApiTags(SwaggerTag.Moderators)
@Controller('admin/branch-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.MODERATOR)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Faqat MODERATOR va SUPER_ADMIN',
  type: ApiErrorDto,
})
export class SupplyOrdersAdminController {
  constructor(private readonly supply: SupplyOrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Ta’minot buyurtmalari (markaz)',
    description: 'Filtr: holat, buyurtma bergan filial.',
  })
  @ApiDataResponse(PaginatedSupplyOrders, { description: 'Sahifalangan' })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: SupplyOrderQueryDto,
  ): Promise<PaginatedResult<SupplyOrderListItemDto>> {
    return this.supply.findForCentral(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ta’minot buyurtmasi' })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(SupplyOrderResponseDto, { description: 'Buyurtma' })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa markaziy omborniki',
    type: ApiErrorDto,
  })
  findOne(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<SupplyOrderResponseDto> {
    return this.supply.findOneForCentral(actor, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Ta’minot buyurtmasi holatini o‘zgartirish',
    description:
      'B-029 dagi matritsa (yetkazib berish / olib ketish yo‘li). Faqat ' +
      'ta’minot buyurtmasi — mijoz buyurtmasi bu yo‘lda "topilmadi".',
  })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(OrderStatusChangeResponseDto, {
    description: 'Yangi holat va tarix',
  })
  @ApiBadRequestResponse({
    description: 'Ruxsat etilmagan o‘tish yoki o‘sha holat',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa markaziy omborniki',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Holat hozirgina boshqa xodim tomonidan o‘zgartirildi',
    type: ApiErrorDto,
  })
  changeStatus(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: ChangeOrderStatusDto,
  ): Promise<OrderStatusChangeResponseDto> {
    return this.supply.changeStatus(actor, id, dto);
  }
}
