import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { UserRole } from '../../common/enums';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import {
  ProductStockAdminResponseDto,
  ProductStockQueryDto,
  UpsertProductStockDto,
} from './dto';
import { ProductStocksService } from './product-stocks.service';

const PaginatedProductStocks = PaginatedResponseDto(
  ProductStockAdminResponseDto,
);

/**
 * Markaziy ombor zaxirasi (B-021, TZ 3.2, 3.7.1).
 *
 * 🔒 Filial admini zaxirani KO'RADI, lekin o'zgartirmaydi («ko'radi, lekin
 *    boshqarmaydi»). O'zgartirish — faqat MODERATOR va SUPER_ADMIN.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/product-stocks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class ProductStocksAdminController {
  constructor(private readonly stocks: ProductStocksService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MODERATOR,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({
    summary: 'Markaziy ombor zaxirasi',
    description:
      'Har bir mahsulot uchun bitta qator — zaxira filialga bog‘lanmagan, ' +
      'hamma bir xil sonni ko‘radi.\n\n' +
      'Zaxira hali kiritilmagan mahsulot ham ro‘yxatda bor: `stockPallets: 0`, ' +
      '`updatedAt: null`.',
  })
  @ApiDataResponse(PaginatedProductStocks, {
    description: 'Sahifalangan zaxira ro‘yxati',
  })
  findAll(
    @Query() query: ProductStockQueryDto,
  ): Promise<PaginatedResult<ProductStockAdminResponseDto>> {
    return this.stocks.findAll(query);
  }

  @Put()
  @Roles(UserRole.SUPER_ADMIN, UserRole.MODERATOR)
  @ApiOperation({
    summary: 'Zaxirani o‘rnatish',
    description:
      '`stockPallets` — ombordagi YANGI son (farq emas).\n\n' +
      '`lowStockThreshold`: yuborilmasa — o‘zgarmaydi, `null` — global ' +
      'sozlamaga qaytadi.',
  })
  @ApiDataResponse(ProductStockAdminResponseDto, {
    description: 'Saqlangan zaxira',
  })
  @ApiBadRequestResponse({
    description: 'Son manfiy yoki butun emas',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'Mahsulot topilmadi', type: ApiErrorDto })
  upsert(
    @Body() dto: UpsertProductStockDto,
  ): Promise<ProductStockAdminResponseDto> {
    return this.stocks.upsert(dto);
  }
}
