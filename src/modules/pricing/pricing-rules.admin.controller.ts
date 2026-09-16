import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
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
import { CreatePricingRuleDto, PricingRuleAdminDto } from './dto';
import { PricingRulesAdminService } from './pricing-rules-admin.service';

/**
 * Mijozga individual narx (B-055).
 *
 * 🔒 Mijoz o'zi bu qoidalarni HECH QACHON ko'rmaydi — faqat yakuniy narx
 *    (kalkulyator/buyurtma). Filial admini faqat o'zi qo'yganini ko'radi.
 */
@ApiTags(SwaggerTag.Pricing)
@Controller('admin/customers/:id/pricing-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
@ApiBearerAuth(BEARER_AUTH)
@ApiParam({ name: 'id', description: 'Mijoz ID' })
@ApiForbiddenResponse({
  description: 'Faqat SUPER_ADMIN va BRANCH_ADMIN',
  type: ApiErrorDto,
})
@ApiNotFoundResponse({
  description: 'Mijoz (yoki qoida) topilmadi yoki boshqa filialniki',
  type: ApiErrorDto,
})
export class PricingRulesAdminController {
  constructor(private readonly rules: PricingRulesAdminService) {}

  @Get()
  @ApiOperation({
    summary: 'Mijozning individual narx qoidalari',
    description:
      '🔒 Filial admini faqat O‘ZI qo‘ygan qoidalarni ko‘radi; bosh admin ' +
      'qoidalari unga ko‘rinmaydi.',
  })
  @ApiDataResponse(PricingRuleAdminDto, {
    isArray: true,
    description: 'Qoidalar',
  })
  list(
    @CurrentActor() actor: Actor,
    @Param('id') customerId: string,
  ): Promise<PricingRuleAdminDto[]> {
    return this.rules.list(actor, customerId);
  }

  @Post()
  @ApiOperation({
    summary: 'Qoida qo‘shish',
    description:
      'Ustunlik: aniq mahsulot/yo‘nalish → zavod → umumiy (ALL) → bazaviy ' +
      'filial narxi.\n\n' +
      '🔒 Filial admini: faqat PERCENT chegirma, sozlamadagi chegaragacha.\n\n' +
      'Qoida tahrirlanmaydi — o‘chirib, yangisini qo‘shing.',
  })
  @ApiDataResponse(PricingRuleAdminDto, {
    status: 201,
    description: 'Qo‘shildi',
  })
  @ApiBadRequestResponse({
    description:
      'Domen/scope mos emas, scopeId yo‘q/topilmadi, qiymat noto‘g‘ri ' +
      'yoki filial admini chegarasidan oshdi',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Shu darajada qoida allaqachon bor',
    type: ApiErrorDto,
  })
  create(
    @CurrentActor() actor: Actor,
    @Param('id') customerId: string,
    @Body() dto: CreatePricingRuleDto,
  ): Promise<PricingRuleAdminDto> {
    return this.rules.create(actor, customerId, dto);
  }

  @Delete(':ruleId')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Qoidani o‘chirish',
    description: 'Mijoz narxi darhol keyingi aniq qoidaga / bazaviyga qaytadi.',
  })
  @ApiParam({ name: 'ruleId', description: 'Qoida ID' })
  @ApiDataResponse(PricingRuleAdminDto, { description: 'O‘chirildi' })
  remove(
    @CurrentActor() actor: Actor,
    @Param('id') customerId: string,
    @Param('ruleId') ruleId: string,
  ): Promise<PricingRuleAdminDto> {
    return this.rules.remove(actor, customerId, ruleId);
  }
}
