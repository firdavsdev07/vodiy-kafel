import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { UserRole } from '../../common/enums';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { SettingAdminDto, UpdateSettingDto } from './dto';
import { SettingsService } from './settings.service';

/**
 * Sozlamalar boshqaruvi (B-025).
 *
 * 🔒 O'QISH — SUPER_ADMIN va BRANCH_ADMIN: filial admini chegirma berishda
 *    o'z chegarasini ko'rishi kerak (B-055). YOZISH — faqat SUPER_ADMIN:
 *    sozlamalar barcha filiallarga ta'sir qiladi.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class SettingsAdminController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
  @ApiOperation({
    summary: 'Barcha sozlamalar',
    description:
      'Tizim taniydigan barcha kalitlar. Bazada hali saqlanmaganlari ' +
      'standart qiymat bilan (`isDefault: true`).',
  })
  @ApiDataResponse(SettingAdminDto, {
    isArray: true,
    description: 'Sozlamalar',
  })
  findAll(): Promise<SettingAdminDto[]> {
    return this.settings.findAdmin();
  }

  @Patch()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Sozlamani o‘zgartirish',
    description:
      'Qiymat kalitning qoidasi bo‘yicha tekshiriladi — noto‘g‘ri tur yoki ' +
      'chegaradan tashqari qiymat 400. Yangi kalit yaratib bo‘lmaydi.\n\n' +
      'O‘zgarish darhol kuchga kiradi.',
  })
  @ApiDataResponse(SettingAdminDto, { description: 'Saqlangan sozlama' })
  @ApiBadRequestResponse({
    description: 'Noma’lum kalit yoki qiymat noto‘g‘ri',
    type: ApiErrorDto,
  })
  update(@Body() dto: UpdateSettingDto): Promise<SettingAdminDto> {
    return this.settings.update(dto.key, dto.value);
  }
}
