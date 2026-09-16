import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { BranchProductsService } from './branch-products.service';
import {
  BranchProductAdminResponseDto,
  BranchProductQueryDto,
  UpdateBranchProductPriceDto,
  UpsertBranchProductDto,
} from './dto';

const PaginatedBranchProducts = PaginatedResponseDto(
  BranchProductAdminResponseDto,
);

const SCOPE_NOTE =
  '🔒 Filial izolyatsiyasi: filial admini, menejer va moderator faqat O‘Z ' +
  'filialini ko‘radi. Boshqa filial so‘ralsa — 404 (403 emas).';

/**
 * Filial narxlari (B-021, TZ 3.7.1).
 *
 * 🔒 YOZISH — SUPER_ADMIN (istalgan filial) va BRANCH_ADMIN (faqat o'z
 *    filiali). MANAGER narxni o'zgartirmaydi: TZ narxni filial admini
 *    zimmasiga qo'yadi. MODERATOR o'z markaziy omborining ta'minot narxini
 *    ko'radi, lekin uni SUPER_ADMIN belgilaydi — aks holda ombor o'zi
 *    filiallarga sotish narxini o'zi qo'yardi.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/branch-products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class BranchProductsAdminController {
  constructor(private readonly branchProducts: BranchProductsService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MODERATOR,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({
    summary: 'Filial narxlari ro‘yxati',
    description:
      'Filialning BAZAVIY narxlari. Mijozga individual narx qoidalari bu ' +
      'yerda ko‘rinmaydi.\n\n' +
      SCOPE_NOTE +
      '\n\nSUPER_ADMIN `branchId` bermasa — barcha filiallar.',
  })
  @ApiDataResponse(PaginatedBranchProducts, {
    description: 'Sahifalangan filial narxlari',
  })
  @ApiNotFoundResponse({
    description: 'Boshqa filial so‘raldi',
    type: ApiErrorDto,
  })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: BranchProductQueryDto,
  ): Promise<PaginatedResult<BranchProductAdminResponseDto>> {
    return this.branchProducts.findAll(actor, query);
  }

  @Put()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
  @ApiOperation({
    summary: 'Filial narxini o‘rnatish (bor bo‘lsa yangilanadi)',
    description:
      '(filial, mahsulot) juftligi bo‘yicha: yozuv bo‘lmasa yaratiladi.\n\n' +
      '🔒 Filial admini uchun `branchId` e’tiborga olinmaydi — narx har doim ' +
      'o‘z filialiga yoziladi; boshqa filial ko‘rsatilsa 404. SUPER_ADMIN ' +
      'uchun `branchId` majburiy (bermasa 400).\n\n' +
      '⚠ Narx o‘zgarishi eski buyurtmalarga ta’sir qilmaydi — ular narx ' +
      'suratini saqlaydi.',
  })
  @ApiDataResponse(BranchProductAdminResponseDto, {
    description: 'Saqlangan filial narxi',
  })
  @ApiBadRequestResponse({
    description: 'Narx noto‘g‘ri yoki SUPER_ADMIN `branchId` bermadi',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Filial yoki mahsulot topilmadi (yoki begona filial)',
    type: ApiErrorDto,
  })
  upsert(
    @CurrentActor() actor: Actor,
    @Body() dto: UpsertBranchProductDto,
  ): Promise<BranchProductAdminResponseDto> {
    return this.branchProducts.upsert(actor, dto);
  }

  @Patch(':id/price')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
  @ApiOperation({
    summary: 'Filial narxini o‘zgartirish',
    description: SCOPE_NOTE,
  })
  @ApiParam({ name: 'id', description: 'Filial narxi (BranchProduct) ID' })
  @ApiDataResponse(BranchProductAdminResponseDto, {
    description: 'Yangilangan filial narxi',
  })
  @ApiBadRequestResponse({ description: 'Narx noto‘g‘ri', type: ApiErrorDto })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filialga tegishli',
    type: ApiErrorDto,
  })
  updatePrice(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: UpdateBranchProductPriceDto,
  ): Promise<BranchProductAdminResponseDto> {
    return this.branchProducts.updatePrice(actor, id, dto);
  }
}
