import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
  CreateProductDto,
  ProductAdminQueryDto,
  ProductAdminResponseDto,
  SetSimilarProductsDto,
  SimilarProductLinkDto,
  UpdateProductDto,
} from './dto';
import { ProductsAdminService } from './products-admin.service';
import { SimilarProductsService } from './similar-products.service';

const PaginatedAdminProducts = PaginatedResponseDto(ProductAdminResponseDto);

/**
 * Mahsulot katalogi — admin (B-021).
 *
 * 🔒 O'QISH — barcha xodimlar (menejer buyurtma kiritayotganda katalogni
 *    ko'rishi kerak). YOZISH — faqat SUPER_ADMIN: katalog umumiy, filial
 *    admini yaratgan mahsulot boshqa filiallarda ham paydo bo'lardi.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class ProductsAdminController {
  constructor(
    private readonly productsAdmin: ProductsAdminService,
    private readonly similarProducts: SimilarProductsService,
  ) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MODERATOR,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({
    summary: 'Mahsulotlar (o‘chirilganlari bilan)',
    description:
      'Ochiq katalogdagi filtrlar + `isActive`.\n\n' +
      'Javobda markaziy ombor zaxirasining ANIQ soni va uch rangli holati ' +
      '(`stock`) bor — bu ichki ko‘rinish.\n\n' +
      '⚠ Narx bu yerda yo‘q — filial narxlari `GET /admin/branch-products`.',
  })
  @ApiDataResponse(PaginatedAdminProducts, {
    description: 'Sahifalangan mahsulotlar',
  })
  findAll(
    @Query() query: ProductAdminQueryDto,
  ): Promise<PaginatedResult<ProductAdminResponseDto>> {
    return this.productsAdmin.findAll(query);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MODERATOR,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({ summary: 'Bitta mahsulot' })
  @ApiParam({ name: 'id', description: 'Mahsulot ID' })
  @ApiDataResponse(ProductAdminResponseDto, { description: 'Mahsulot' })
  @ApiNotFoundResponse({ description: 'Mahsulot topilmadi', type: ApiErrorDto })
  findOne(@Param('id') id: string): Promise<ProductAdminResponseDto> {
    return this.productsAdmin.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Yangi mahsulot',
    description:
      'Faqat umumiy tavsif. Narx har filial uchun alohida ' +
      '(`PUT /admin/branch-products`), zaxira — `PUT /admin/product-stocks`.\n\n' +
      '`slug` nom va o‘lchamdan avtomatik yasaladi (`lyuks-keramogranit-60x60`) ' +
      'va keyin o‘zgarmaydi.',
  })
  @ApiDataResponse(ProductAdminResponseDto, {
    status: 201,
    description: 'Mahsulot yaratildi',
  })
  @ApiBadRequestResponse({
    description: 'Maydonlar noto‘g‘ri, zavod yoki o‘lcham topilmadi',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Shu nom va o‘lchamdagi mahsulot allaqachon bor',
    type: ApiErrorDto,
  })
  create(@Body() dto: CreateProductDto): Promise<ProductAdminResponseDto> {
    return this.productsAdmin.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Mahsulotni tahrirlash',
    description:
      'Faqat yuborilgan maydonlar o‘zgaradi. `slug` o‘zgarmaydi.\n\n' +
      '⚠ `sqmPerPallet` / `weightPerPallet` o‘zgarishi ESKI buyurtmalarga ' +
      'ta’sir qilmaydi — ular buyurtma paytidagi qiymatni saqlaydi.',
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID' })
  @ApiDataResponse(ProductAdminResponseDto, {
    description: 'Yangilangan mahsulot',
  })
  @ApiBadRequestResponse({
    description: 'Maydonlar noto‘g‘ri, zavod yoki o‘lcham topilmadi',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'Mahsulot topilmadi', type: ApiErrorDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductAdminResponseDto> {
    return this.productsAdmin.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Mahsulotni o‘chirish (soft delete)',
    description:
      'Yozuv bazadan o‘chirilmaydi — `isActive: false`, ochiq katalogdan ' +
      'yo‘qoladi. Buyurtma tarixi saqlanib qolishi uchun.\n\n' +
      'Qaytarish: `PATCH { "isActive": true }`.',
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID' })
  @ApiDataResponse(ProductAdminResponseDto, {
    description: 'O‘chirilgan mahsulot (isActive: false)',
  })
  @ApiNotFoundResponse({ description: 'Mahsulot topilmadi', type: ApiErrorDto })
  remove(@Param('id') id: string): Promise<ProductAdminResponseDto> {
    return this.productsAdmin.softDelete(id);
  }

  @Get(':id/similar')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MODERATOR,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({
    summary: 'Qo‘lda bog‘langan o‘xshash mahsulotlar',
    description:
      'Faqat admin bog‘laganlari (avtomatik tanlov bu yerda yo‘q). ' +
      'O‘chirilgan mahsulotlar ham ko‘rinadi — ochiq sahifada ular chiqmaydi.',
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID' })
  @ApiDataResponse(SimilarProductLinkDto, {
    isArray: true,
    description: 'Bog‘lanishlar tartib bilan',
  })
  @ApiNotFoundResponse({ description: 'Mahsulot topilmadi', type: ApiErrorDto })
  findSimilar(@Param('id') id: string): Promise<SimilarProductLinkDto[]> {
    return this.similarProducts.findLinks(id);
  }

  @Post(':id/similar')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'O‘xshash mahsulotlarni belgilash',
    description:
      'Ro‘yxat TO‘LIQ almashtiriladi (qo‘shilmaydi). Bo‘sh massiv — hammasini ' +
      'olib tashlash. Tartib — massiv tartibi.\n\n' +
      'Bog‘lanish bir tomonlama: A → B qo‘yilsa, B sahifasida A o‘zi chiqmaydi.',
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID' })
  @ApiDataResponse(SimilarProductLinkDto, {
    isArray: true,
    description: 'Yangi bog‘lanishlar',
  })
  @ApiBadRequestResponse({
    description: 'O‘ziga bog‘lash, topilmagan ID yoki dublikat',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'Mahsulot topilmadi', type: ApiErrorDto })
  setSimilar(
    @Param('id') id: string,
    @Body() dto: SetSimilarProductsDto,
  ): Promise<SimilarProductLinkDto[]> {
    return this.similarProducts.setLinks(id, dto.similarProductIds);
  }
}
