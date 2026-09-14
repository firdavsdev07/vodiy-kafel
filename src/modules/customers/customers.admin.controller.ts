import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { CurrentActor } from '../../auth/decorators/current-actor.decorator';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { CustomersService } from './customers.service';
import { ResetPasswordResponseDto } from './dto';

/**
 * Optom mijozlarni boshqarish — xodimlar uchun.
 *
 * Hozircha faqat parol tiklash (B-017). To'liq CRUD — B-036.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
export class CustomersAdminController {
  constructor(private readonly customersService: CustomersService) {}

  @Post(':id/reset-password')
  // Nest POST uchun standart 201 qaytaradi, `@ApiDataResponse` esa 200 deb
  // e'lon qiladi — Swagger yolg'on kontrakt berardi. Bu yerda yangi RESURS
  // yaratilmaydi (mavjud mijozning paroli almashadi), shuning uchun 200.
  @HttpCode(200)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
    UserRole.MODERATOR,
  )
  @ApiOperation({
    summary: 'Optom mijozga yangi vaqtinchalik parol berish',
    description:
      'Mijoz parolni unutganda yoki hisob birinchi marta topshirilayotganda ' +
      'ishlatiladi.\n\n' +
      '⚠ Yangi parol javobda FAQAT BIR MARTA ko‘rinadi — bazada hash ' +
      'saqlanadi. Uni mijozga telefon yoki Telegram orqali yetkazing.\n\n' +
      'Mijoz keyingi kirishida parolni almashtirishga majbur bo‘ladi.\n\n' +
      '🔒 Filial admini/menejeri faqat O‘Z filiali mijoziga parol bera ' +
      'oladi; begona filial mijozi uchun 404 qaytadi.\n\n' +
      '⚠ Eski tokenlar darhol o‘chmaydi: mijozning qo‘lidagi access token ' +
      'muddati tugaguncha (15 daqiqa) ishlashda davom etadi. Refresh esa ' +
      'holatni bazadan o‘qigani uchun darhol to‘siladi.',
  })
  @ApiParam({ name: 'id', description: 'Mijoz ID' })
  @ApiDataResponse(ResetPasswordResponseDto, {
    description: 'Yangi vaqtinchalik parol yaratildi',
  })
  @ApiNotFoundResponse({
    description:
      'Mijoz topilmadi yoki boshqa filialga tegishli (ikki holat ' +
      'ataylab farqlanmaydi)',
    type: ApiErrorDto,
  })
  @ApiForbiddenResponse({
    description: 'Bu amal uchun rol yetarli emas',
    type: ApiErrorDto,
  })
  resetPassword(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<ResetPasswordResponseDto> {
    return this.customersService.resetPassword(actor, id);
  }
}
