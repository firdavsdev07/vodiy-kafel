import { Controller, Get, Param, Query } from '@nestjs/common';
import {
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
} from './dto';
import { ProductsService } from './products.service';

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
  constructor(private readonly productsService: ProductsService) {}

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
}
