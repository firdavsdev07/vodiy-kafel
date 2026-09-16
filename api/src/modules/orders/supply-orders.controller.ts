import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
  CreateSupplyOrderDto,
  SupplyOrderListItemDto,
  SupplyOrderQueryDto,
  SupplyOrderResponseDto,
} from './dto';
import { SupplyOrdersService } from './supply-orders.service';

const PaginatedSupplyOrders = PaginatedResponseDto(SupplyOrderListItemDto);

/**
 * Do'kon filiali → markaziy ombor ta'minot buyurtmasi (B-058, TZ 3.7.2).
 * Maqsad — telefon qilmasdan real vaqtda narx va yo'l kira bilan buyurtma.
 */
@ApiTags(SwaggerTag.Orders)
@Controller('branch-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BRANCH_ADMIN, UserRole.MANAGER)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Faqat do‘kon (RETAIL) filiali admini yoki menejeri',
  type: ApiErrorDto,
})
export class SupplyOrdersController {
  constructor(private readonly supply: SupplyOrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Markaziy omborga ta’minot buyurtmasi',
    description:
      'Xuddi mijoz kabi: mahsulot + paddon, ixtiyoriy viloyat + transport.\n\n' +
      '🔒 Narx — markaziy omborning ta’minot narxi va tariflari (backendda). ' +
      'Buyurtma bergan filial — tokendan. Kalkulyator yo‘li bilan bir xil ' +
      'hisob; omborda yetmasa — 409.\n\n' +
      '❓ ETA (yetib kelish vaqti) — ma’lumot manbai yo‘q, hozircha qaytmaydi.',
  })
  @ApiDataResponse(SupplyOrderResponseDto, {
    status: 201,
    description: 'Buyurtma yaratildi — summa va yo‘l kira bilan',
  })
  @ApiBadRequestResponse({
    description:
      'Tarkib xato, viloyat/transport faqat bittasi, markaziy ombor aniqlanmadi',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Mahsulot markazda sotilmaydi yoki tarif yo‘q',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Omborda yetarli emas',
    type: ApiErrorDto,
  })
  create(
    @CurrentActor() actor: Actor,
    @Body() dto: CreateSupplyOrderDto,
  ): Promise<SupplyOrderResponseDto> {
    return this.supply.create(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Filialimizning ta’minot buyurtmalari' })
  @ApiDataResponse(PaginatedSupplyOrders, { description: 'Sahifalangan' })
  findMine(
    @CurrentActor() actor: Actor,
    @Query() query: SupplyOrderQueryDto,
  ): Promise<PaginatedResult<SupplyOrderListItemDto>> {
    return this.supply.findMine(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ta’minot buyurtmasi (holat tarixi bilan)' })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(SupplyOrderResponseDto, { description: 'Buyurtma' })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filialniki',
    type: ApiErrorDto,
  })
  findOne(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<SupplyOrderResponseDto> {
    return this.supply.findMineOne(actor, id);
  }
}
