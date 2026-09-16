import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { SwaggerTag } from '../../swagger/tags';
import { TrackOrderQueryDto, TrackOrderResponseDto } from './dto';
import { OrderStatusService } from './order-status.service';

/**
 * Buyurtmani kuzatish — OCHIQ, telefon tasdig'i bilan (B-029).
 *
 * Alohida controller: `OrdersController` butunlay mijoz tokeni bilan
 * qulflangan, bu esa token talab qilmaydi (telefon orqali kelgan buyurtma
 * egasida hisob bo'lmasligi mumkin).
 */
@ApiTags(SwaggerTag.Orders)
@Controller('orders')
export class OrderTrackingController {
  constructor(private readonly orderStatus: OrderStatusService) {}

  @Get(':orderNumber/track')
  @ApiOperation({
    summary: 'Buyurtma holatini kuzatish (token siz)',
    description:
      'Buyurtma raqami + egasining telefoni. Telefon mos kelmasa javob ' +
      '"topilmadi" bilan bir xil.\n\n' +
      '🔒 Faqat holat va vaqtlar — summa, mahsulotlar, izohlar yo‘q.',
  })
  @ApiParam({ name: 'orderNumber', example: 'VK-2026-000001' })
  @ApiDataResponse(TrackOrderResponseDto, { description: 'Holat va tarix' })
  @ApiNotFoundResponse({
    description: 'Buyurtma topilmadi yoki telefon mos kelmadi',
    type: ApiErrorDto,
  })
  track(
    @Param('orderNumber') orderNumber: string,
    @Query() query: TrackOrderQueryDto,
  ): Promise<TrackOrderResponseDto> {
    return this.orderStatus.track(orderNumber, query.phone);
  }
}
