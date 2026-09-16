import { Body, Controller, Headers, Post, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { SwaggerTag } from '../../swagger/tags';
import { PaymentWebhookService } from './payment-webhook.service';

/**
 * To'lov tizimi chaqiradigan manzil (B-034). Token YO'Q — ishonch
 * chegarasi provayder imzosi (`verifyWebhook`).
 *
 * ⚠ Javob `{ data: ... }` ga O'RALMAYDI (`@Res`): provayder o'z
 *   formatidagi javobni kutadi.
 */
@ApiTags(SwaggerTag.Payments)
@Controller('webhooks')
export class PaymentWebhookController {
  constructor(private readonly webhooks: PaymentWebhookService) {}

  @Post('payment')
  @ApiOperation({
    summary: 'To‘lov tizimi xabari (webhook)',
    description:
      '⚠ Frontend CHAQIRMAYDI — faqat to‘lov tizimi.\n\n' +
      '🔒 Imzo tekshiriladi; bir xil xabar qayta kelsa ikki marta ' +
      'hisoblanmaydi. Xom xabar to‘liq saqlanadi.',
  })
  @ApiOkResponse({ description: 'Provayder kutgan formatdagi javob' })
  @ApiUnauthorizedResponse({
    description: 'Imzo noto‘g‘ri',
    type: ApiErrorDto,
  })
  async receive(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.webhooks.process({ headers, body });
    res.status(200).json(result.reply);
  }
}
