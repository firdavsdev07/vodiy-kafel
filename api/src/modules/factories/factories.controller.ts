import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '../../common';
import { SwaggerTag } from '../../swagger/tags';
import { FactoryPublicResponseDto } from './dto';
import { FactoriesService } from './factories.service';

/**
 * Zavodlar — OCHIQ vitrina (TZ 3.8).
 *
 * ⚠ Token TALAB QILINMAYDI: chakana mijozda hisob yo'q, u saytni shunchaki
 *   ko'radi (CLAUDE.md qoida 4). Bu yerda narx ham, zaxira ham yo'q —
 *   faqat zavod nomi va logotipi.
 */
@ApiTags(SwaggerTag.Catalog)
@Controller('factories')
export class FactoriesController {
  constructor(private readonly factoriesService: FactoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Zavodlar vitrinasi',
    description:
      'Bosh sahifadagi logotip-kartalar uchun faol zavodlar ro‘yxati.\n\n' +
      'Tartib: avval admin qo‘ygan tartib raqami, teng bo‘lsa alifbo ' +
      'bo‘yicha. O‘chirilgan zavodlar ro‘yxatga tushmaydi.\n\n' +
      'Sahifalash yo‘q — zavodlar soni chegaralangan (o‘nlab, yuzlab emas).',
  })
  @ApiDataResponse(FactoryPublicResponseDto, {
    isArray: true,
    description: 'Faol zavodlar',
  })
  findAll(): Promise<FactoryPublicResponseDto[]> {
    return this.factoriesService.findAllPublic();
  }
}
