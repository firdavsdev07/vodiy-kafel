import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { SwaggerTag } from '../../swagger/tags';
import {
  ProductDetailResponseDto,
  ProductListItemResponseDto,
  ProductQueryDto,
  SimilarProductsQueryDto,
} from './dto';
import { ProductsService } from './products.service';
import { SimilarProductsService } from './similar-products.service';

/** Swagger uchun sahifalangan javob klassi. */
const PaginatedProducts = PaginatedResponseDto(ProductListItemResponseDto);

/**
 * Katalog — OCHIQ (B-020).
 *
 * ⚠ Token talab qilinmaydi: chakana mijozda hisob yo'q (CLAUDE.md qoida 4).
 *
 * 🔒 Bu endpointlar NARXNI ham, zaxira aniq sonini ham qaytarmaydi.
 *    Narxni ko'rish uchun optom mijoz login qilishi kerak (B-017).
 */
@ApiTags(SwaggerTag.Catalog)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly similarProducts: SimilarProductsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Mahsulotlar ro‘yxati va filtr',
    description:
      'Zavod, o‘lcham, sirt turi bo‘yicha filtr va nom/zavod bo‘yicha ' +
      'qidiruv. Sahifalangan.\n\n' +
      '🔒 Javobda narx YO‘Q va zaxiraning aniq soni YO‘Q — faqat ' +
      '`availability`: `AVAILABLE` yoki `UNAVAILABLE`.\n\n' +
      'O‘chirilgan mahsulotlar va o‘chirilgan ZAVODNING mahsulotlari ' +
      'ro‘yxatga tushmaydi.',
  })
  @ApiDataResponse(PaginatedProducts, {
    description: 'Sahifalangan mahsulotlar',
  })
  findAll(
    @Query() query: ProductQueryDto,
  ): Promise<PaginatedResult<ProductListItemResponseDto>> {
    return this.productsService.findAllPublic(query);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Mahsulot sahifasi',
    description:
      'Kartadagi hamma narsa + tavsif va to‘liq media ro‘yxati ' +
      '(suratlar, 360° materiallar).\n\n' +
      '🔒 Narx va zaxira aniq soni bu yerda ham yo‘q.\n\n' +
      '⚠ Ko‘rishlar soni bu endpointda OSHMAYDI — buning uchun alohida ' +
      '`POST /products/:slug/view` bo‘ladi. Aks holda har bir bot ' +
      'tashrifi statistikani buzardi.',
  })
  @ApiParam({
    name: 'slug',
    description: 'Mahsulot URL nomi',
    example: 'lyuks-keramogranit-60x60',
  })
  @ApiDataResponse(ProductDetailResponseDto, { description: 'Mahsulot' })
  @ApiNotFoundResponse({
    description: 'Mahsulot topilmadi, o‘chirilgan yoki zavodi o‘chirilgan',
    type: ApiErrorDto,
  })
  findOne(@Param('slug') slug: string): Promise<ProductDetailResponseDto> {
    return this.productsService.findOneBySlug(slug);
  }

  @Get(':slug/similar')
  @ApiOperation({
    summary: 'Shunga o‘xshash mahsulotlar',
    description:
      'Mahsulot kartochkasi ostidagi blok (TZ 3.1).\n\n' +
      '1. Admin qo‘lda bog‘lagan mahsulotlar — doim birinchi.\n' +
      '2. Mahsulotning o‘zi kam qolgan yoki tugagan bo‘lsa — qolgan joy ' +
      'avtomatik to‘ldiriladi: bir xil o‘lcham va sirt, omborda yetarli; ' +
      'bir xil rangdagilar oldinda.\n\n' +
      'Omborda yo‘q va o‘chirilgan mahsulotlar chiqmaydi.\n\n' +
      '🔒 Narx va zaxira aniq soni yo‘q — oddiy katalog kartasi.',
  })
  @ApiParam({ name: 'slug', description: 'Mahsulot URL nomi' })
  @ApiDataResponse(ProductListItemResponseDto, {
    isArray: true,
    description: 'O‘xshash mahsulotlar (bo‘sh bo‘lishi mumkin)',
  })
  @ApiNotFoundResponse({
    description: 'Mahsulot topilmadi yoki o‘chirilgan',
    type: ApiErrorDto,
  })
  findSimilar(
    @Param('slug') slug: string,
    @Query() query: SimilarProductsQueryDto,
  ): Promise<ProductListItemResponseDto[]> {
    return this.similarProducts.findPublic(slug, query.limit);
  }

  @Post(':slug/view')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Ko‘rishni hisoblash',
    description:
      'Mahsulot sahifasi haqiqatan ochilganda frontend BIR MARTA chaqiradi ' +
      '(token shart emas). Javob tanasi yo‘q.\n\n' +
      'Soni ochiq javoblarda ko‘rsatilmaydi — "o‘xshash mahsulotlar" ' +
      'saralashi va admin statistikasi uchun.',
  })
  @ApiParam({ name: 'slug', example: 'lyuks-keramogranit-60x60' })
  @ApiNoContentResponse({ description: 'Hisoblandi' })
  @ApiNotFoundResponse({
    description: 'Mahsulot topilmadi yoki vitrinada yo‘q',
    type: ApiErrorDto,
  })
  recordView(@Param('slug') slug: string): Promise<void> {
    return this.productsService.recordView(slug);
  }
}
