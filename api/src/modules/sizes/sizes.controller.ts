import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '../../common';
import { SwaggerTag } from '../../swagger/tags';
import { SizePublicResponseDto } from './dto';
import { SizesService } from './sizes.service';

/**
 * O'lchamlar — OCHIQ ro'yxat (TZ 3.8: katalogda o'lcham bo'yicha filtr).
 *
 * ⚠ Token talab qilinmaydi — bu katalogning bir qismi.
 */
@ApiTags(SwaggerTag.Catalog)
@Controller('sizes')
export class SizesController {
  constructor(private readonly sizesService: SizesService) {}

  @Get()
  @ApiOperation({
    summary: 'O‘lchamlar ro‘yxati (filtr uchun)',
    description:
      'Katalogdagi «o‘lcham bo‘yicha filtr» ro‘yxati.\n\n' +
      'Tartib: avval admin qo‘ygan tartib raqami, teng bo‘lsa yozuv ' +
      'bo‘yicha. Sahifalash yo‘q — o‘lchamlar soni chegaralangan.',
  })
  @ApiDataResponse(SizePublicResponseDto, {
    isArray: true,
    description: 'O‘lchamlar',
  })
  findAll(): Promise<SizePublicResponseDto[]> {
    return this.sizesService.findAllPublic();
  }
}
