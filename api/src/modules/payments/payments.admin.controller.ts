import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
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
import { CurrentActor, Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { AdminPaymentResponseDto, ConfirmPaymentDto } from './dto';
import { PaymentsService } from './payments.service';

/**
 * To'lovlar — admin (B-034).
 *
 * Tasdiqlash — pul bilan bog'liq vakolat, shuning uchun MANAGER emas:
 * SUPER_ADMIN, filial admini va (markaz/agent buyurtmalari uchun) moderator.
 * 🔒 Filial izolyatsiyasi servisda — begona filial to'lovi 404.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class PaymentsAdminController {
  constructor(private readonly payments: PaymentsService) {}

  @Patch(':id/confirm')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.MODERATOR)
  @ApiOperation({
    summary: 'Naqd / o‘tkazma to‘lovini tasdiqlash',
    description:
      'To‘lov `PAID` bo‘ladi va mijoz hisobiga to‘lov yozuvi tushadi ' +
      '(kim tasdiqlagani bilan).\n\n' +
      '🔒 Karta to‘lovi bu yerdan tasdiqlanmaydi — faqat to‘lov tizimi ' +
      'xabari bilan.',
  })
  @ApiParam({ name: 'id', description: 'To‘lov ID' })
  @ApiDataResponse(AdminPaymentResponseDto, { description: 'Tasdiqlandi' })
  @ApiBadRequestResponse({
    description: 'Karta to‘lovi yoki izoh noto‘g‘ri',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'To‘lov topilmadi yoki boshqa filialniki',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'To‘lov kutilayotgan holatda emas (allaqachon PAID va h.k.)',
    type: ApiErrorDto,
  })
  confirm(
    @CurrentActor() actor: Actor,
    @Param('id') paymentId: string,
    @Body() dto: ConfirmPaymentDto,
  ): Promise<AdminPaymentResponseDto> {
    return this.payments.confirm(actor, paymentId, dto);
  }
}
