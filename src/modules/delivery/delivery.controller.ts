import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '../../common';
import { SwaggerTag } from '../../swagger/tags';
import { DeliveryService } from './delivery.service';
import { RegionPublicDto, TransportTypePublicDto } from './dto';

/**
 * Tanlov ro'yxatlari — OCHIQ, narxsiz (B-027). Yo'l kira narxi faqat
 * kalkulyatorda, optom mijoz tokeni bilan.
 */
@ApiTags(SwaggerTag.Delivery)
@Controller()
export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get('transport-types')
  @ApiOperation({
    summary: 'Transport turlari',
    description: 'Faol transport turlari va sig‘imi. Narx yo‘q.',
  })
  @ApiDataResponse(TransportTypePublicDto, {
    isArray: true,
    description: 'Transport turlari',
  })
  findTransportTypes(): Promise<TransportTypePublicDto[]> {
    return this.delivery.findTransportTypes();
  }

  @Get('regions')
  @ApiOperation({
    summary: 'Viloyatlar',
    description: 'Yetkazib berish manzili uchun faol viloyatlar.',
  })
  @ApiDataResponse(RegionPublicDto, {
    isArray: true,
    description: 'Viloyatlar',
  })
  findRegions(): Promise<RegionPublicDto[]> {
    return this.delivery.findRegions();
  }
}
