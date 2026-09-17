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
import { CustomerCatalogService } from './customer-catalog.service';
import {
  CustomerCatalogDetailDto,
  CustomerCatalogItemDto,
  ProductQueryDto,
} from './dto';

const PaginatedCatalog = PaginatedResponseDto(CustomerCatalogItemDto);

/**
 * Optom mijoz kabinetining katalogi (B-064, TZ 3.7.1).
 *
 * ⚠ `GET /products` (ochiq katalog) O'ZGARMAYDI — u narx bermaydi va
 *   zaxirani ikki holatda ko'rsatadi. Bu yerda esa mijoz narxni ko'rib,
 *   taqqoslab tanlaydi.
 *
 * 🔒 Faqat optom mijoz tokeni (`CustomerOnlyGuard`) — xodim tokeni bilan
 *    403. Xodim uchun narx `GET /admin/branch-products` da.
 * 🔒 Filial tokendan; so'rovda `branchId` yo'q (CLAUDE.md qoida 5).
 */
@ApiTags(SwaggerTag.Catalog)
@Controller('me/catalog')
@UseGuards(JwtAuthGuard, CustomerOnlyGuard, PasswordChangeRequiredGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiUnauthorizedResponse({
  description:
    'Token yo‘q, muddati o‘tgan, hisob faol emas yoki filial o‘zgargan',
  type: ApiErrorDto,
})
@ApiForbiddenResponse({
  description:
    'Optom mijoz tokeni emas, vaqtinchalik parol almashtirilmagan yoki ' +
    'filial buyurtma qabul qilmaydi',
  type: ApiErrorDto,
})
export class MeCatalogController {
  constructor(private readonly catalog: CustomerCatalogService) {}

  @Get()
  @ApiOperation({
    summary: 'Katalog — narx bilan',
    description:
      'Filtr, qidiruv, saralash va sahifalash `GET /products` bilan ' +
      'AYNAN bir xil shaklda.\n\n' +
      'Farqi: har kartada mijozga tegishli yakuniy `pricePerSqm` va uch ' +
      'darajali `stockStatus` bor.\n\n' +
      '⚠ Ro‘yxatda FAQAT mijoz filialida sotiladigan mahsulotlar bo‘ladi.\n\n' +
      '⚠ Narx bo‘yicha saralash yo‘q: yakuniy narx bazada saqlanmaydi, ' +
      'har mijoz uchun hisoblanadi.',
  })
  @ApiDataResponse(PaginatedCatalog, { description: 'Mahsulotlar' })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: ProductQueryDto,
  ): Promise<PaginatedResult<CustomerCatalogItemDto>> {
    return this.catalog.findAll(actor, query);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Mahsulot sahifasi — narx bilan',
    description:
      'Karta + tavsif + butun media ro‘yxati.\n\n' +
      '🔒 Mijoz filialida sotilmaydigan mahsulot uchun 404 (403 emas) — ' +
      'boshqa filialda nima borligi oshkor qilinmaydi.',
  })
  @ApiParam({ name: 'slug', example: 'lyuks-keramogranit-60x60' })
  @ApiDataResponse(CustomerCatalogDetailDto, { description: 'Mahsulot' })
  @ApiNotFoundResponse({
    description: 'Mahsulot topilmadi yoki filialingizda sotilmaydi',
    type: ApiErrorDto,
  })
  findOne(
    @CurrentActor() actor: Actor,
    @Param('slug') slug: string,
  ): Promise<CustomerCatalogDetailDto> {
    return this.catalog.findOneBySlug(actor, slug);
  }
}
