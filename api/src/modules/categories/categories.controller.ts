import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { SwaggerTag } from '../../swagger/tags';
import { CategoryPublicResponseDto } from './dto';
import { CategoriesService } from './categories.service';

/**
 * Kategoriyalar — OCHIQ vitrina (B-067, TZ 3.8).
 *
 * ⚠ Token TALAB QILINMAYDI: chakana mijozda hisob yo'q, u saytni shunchaki
 *   ko'radi (CLAUDE.md qoida 4). Narx ham, zaxira ham yo'q — faqat nom,
 *   tavsif va muqova surati.
 */
@ApiTags(SwaggerTag.Catalog)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Kategoriyalar vitrinasi',
    description:
      'Katalog navigatsiyasi va bosh sahifadagi lenta uchun faol ' +
      'kategoriyalar ro‘yxati.\n\n' +
      'Tartib: avval admin qo‘ygan tartib raqami, teng bo‘lsa alifbo ' +
      'bo‘yicha. O‘chirilgan kategoriyalar ro‘yxatga tushmaydi.\n\n' +
      'Sahifalash yo‘q — kategoriyalar soni chegaralangan.',
  })
  @ApiDataResponse(CategoryPublicResponseDto, {
    isArray: true,
    description: 'Faol kategoriyalar',
  })
  findAll(): Promise<CategoryPublicResponseDto[]> {
    return this.categories.findAllPublic();
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Bitta kategoriya — slug bo‘yicha',
    description: '`/categories/:slug` sahifasi uchun.',
  })
  @ApiParam({ name: 'slug', description: 'Kategoriya URL nomi' })
  @ApiDataResponse(CategoryPublicResponseDto, { description: 'Kategoriya' })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki o‘chirilgan',
    type: ApiErrorDto,
  })
  findOne(@Param('slug') slug: string): Promise<CategoryPublicResponseDto> {
    return this.categories.findOneBySlug(slug);
  }
}
