import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../../common';
import { ApiErrorDto } from '../../../common/dto/api-error.dto';
import { PrismaService } from '../../../prisma';
import { SwaggerTag } from '../../../swagger/tags';
import { PaymentWebhookService } from '../payment-webhook.service';
import {
  MockPaymentProvider,
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../providers';
import {
  SimulatePaymentDto,
  SimulatePaymentResponseDto,
} from './dev-payment.dto';

/**
 * 🧪 Mock to'lovni qo'lda yakunlash (B-033).
 *
 * ⚠ Faqat `NODE_ENV=development` da ro'yxatdan o'tadi (`app.module`) —
 *   production'da bu yo'l umuman mavjud emas (404).
 *
 * Token talab qilinmaydi: frontendchi checkout oqimini sinash uchun.
 * Xavfsizlik chegarasi — muhit, token emas.
 */
@ApiTags(SwaggerTag.Payments)
@Controller('dev/payments')
export class DevPaymentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webhooks: PaymentWebhookService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  @Post(':id/simulate')
  @HttpCode(200)
  @ApiOperation({
    summary: '🧪 DEV: mock to‘lovni PAID yoki FAILED qilish',
    description:
      'Provayder webhook yuborgandek ishlaydi — to‘lov AYNAN haqiqiy ' +
      'webhook yo‘lidan o‘tadi.\n\n' +
      '⚠ Faqat development muhitida mavjud. Faqat provayder orqali ' +
      'ochilgan (karta) to‘lov uchun — naqd/o‘tkazmani admin tasdiqlaydi.',
  })
  @ApiParam({ name: 'id', description: 'To‘lov ID' })
  @ApiDataResponse(SimulatePaymentResponseDto, {
    description: 'Simulyatsiya natijasi',
  })
  @ApiBadRequestResponse({
    description: 'To‘lov provayder orqali ochilmagan yoki mock yoqilmagan',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'To‘lov topilmadi', type: ApiErrorDto })
  async simulate(
    @Param('id') id: string,
    @Body() dto: SimulatePaymentDto,
  ): Promise<SimulatePaymentResponseDto> {
    if (!(this.provider instanceof MockPaymentProvider)) {
      throw new BadRequestException('Mock to‘lov provayderi yoqilmagan');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      select: { providerRef: true },
    });
    if (!payment) {
      throw new NotFoundException('To‘lov topilmadi');
    }
    if (!payment.providerRef) {
      throw new BadRequestException(
        'Bu to‘lov provayder orqali ochilmagan (naqd yoki o‘tkazma)',
      );
    }

    const result = await this.webhooks.process(
      this.provider.buildWebhook(payment.providerRef, dto.status),
    );
    return {
      paymentId: id,
      status: result.status ?? dto.status,
      outcome: result.outcome,
    };
  }
}
