import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { minutes, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { SwaggerTag } from '../../swagger/tags';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadCreatedDto } from './dto/lead.dto';
import { LeadsService } from './leads.service';

/**
 * Bitta IP dan 10 daqiqada nechta murojaat. Odam bir-ikki marta yozadi;
 * oila/ofis bitta IP dan chiqishini hisobga olib, biroz zaxira bilan.
 */
const LEADS_PER_WINDOW = 5;

/** Saytdagi aloqa formasi — OCHIQ (T-013). */
@ApiTags(SwaggerTag.Leads)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LEADS_PER_WINDOW, ttl: minutes(10) } })
  @ApiOperation({
    summary: 'Murojaat qoldirish (aloqa formasi)',
    description:
      'Token talab qilinmaydi — chakana mehmon ism, telefon va xabar ' +
      'qoldiradi, xodim uni admin panelda (`/admin/leads`) ko‘radi.\n\n' +
      '🔒 Spamga qarshi: bitta IP dan 10 daqiqada ' +
      `${LEADS_PER_WINDOW} ta so‘rov (keyin \`429\`); \`website\` — bot ` +
      'tuzog‘i, har doim bo‘sh yuboriladi; shu telefon + matn 10 daqiqa ' +
      'ichida qayta kelsa, yangi yozuv ochilmaydi — avvalgi ma’lumotnoma ' +
      'qaytadi.\n\n' +
      '`branchId` — ixtiyoriy, `GET /branches` dagi do‘kon.',
  })
  @ApiDataResponse(LeadCreatedDto, {
    status: 201,
    description: 'Qabul qilindi',
  })
  @ApiBadRequestResponse({
    description: 'Maydon xato yoki do‘kon topilmadi',
    type: ApiErrorDto,
  })
  @ApiTooManyRequestsResponse({
    description: 'Juda ko‘p murojaat — birozdan keyin urinib ko‘ring',
    type: ApiErrorDto,
  })
  create(@Body() dto: CreateLeadDto): Promise<LeadCreatedDto> {
    return this.leads.create(dto);
  }
}
