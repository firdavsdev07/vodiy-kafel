import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
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
import {
  CreateStaffDto,
  ResetStaffPasswordDto,
  StaffCreatedDto,
  StaffDto,
  StaffPasswordResetDto,
  StaffQueryDto,
  UpdateStaffDto,
} from './dto/staff.dto';
import { StaffAdminService } from './staff-admin.service';

/**
 * Menejerlar (B-043, TZ 3.12).
 *
 * 🔒 SUPER_ADMIN — hamma filial; filial admini — faqat o'z filiali
 *    (begonasi 404). Menejer faqat RETAIL filialga.
 */
@ApiTags(SwaggerTag.Managers)
@Controller('admin/managers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Faqat SUPER_ADMIN va filial admini',
  type: ApiErrorDto,
})
export class ManagersAdminController {
  constructor(private readonly staff: StaffAdminService) {}

  @Get()
  // T-001: MODERATOR faqat O'QIYDI — optom mijozni menejerga biriktirish
  // uchun ro'yxat kerak. Yaratish/tahrirlash unga ochilmaydi.
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.MODERATOR)
  @ApiOperation({
    summary: 'Menejerlar',
    description:
      'Filtr: filial, holat, qidiruv (ism / telefon / Telegram).\n\n' +
      'MODERATOR — faqat o‘qish (mijozni menejerga biriktirish uchun), ' +
      'barcha filiallar bo‘yicha.',
  })
  @ApiDataResponse(StaffDto, { isArray: true, description: 'Menejerlar' })
  @ApiNotFoundResponse({
    description: 'Boshqa filial so‘raldi',
    type: ApiErrorDto,
  })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: StaffQueryDto,
  ): Promise<StaffDto[]> {
    return this.staff.findAll(actor, 'MANAGER', query);
  }

  @Post()
  @ApiOperation({
    summary: 'Menejer qo‘shish',
    description:
      'Kirish: telefon + parol (javobda FAQAT bir marta).\n\n' +
      '`password` berilsa — aynan o‘sha; bo‘sh qoldirilsa tizim ' +
      'vaqtinchalik parol yaratadi (B-066).\n\n' +
      '🔒 Filial admini — o‘z filialiga; SUPER_ADMIN — `branchId` majburiy, ' +
      'filial RETAIL bo‘lishi shart.',
  })
  @ApiDataResponse(StaffCreatedDto, { status: 201, description: 'Qo‘shildi' })
  @ApiBadRequestResponse({
    description: 'Maydon xato, filial berilmagan/yopiq yoki RETAIL emas',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Boshqa filial ko‘rsatildi',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({ description: 'Telefon band', type: ApiErrorDto })
  create(
    @CurrentActor() actor: Actor,
    @Body() dto: CreateStaffDto,
  ): Promise<StaffCreatedDto> {
    return this.staff.create(actor, 'MANAGER', dto);
  }

  @Post(':id/reset-password')
  // Yangi RESURS yaratilmaydi (mavjud xodimning paroli almashadi) — 200,
  // `@ApiDataResponse` ham 200 deb e'lon qiladi (mijoz endpointi bilan bir xil).
  @HttpCode(200)
  @ApiOperation({
    summary: 'Menejerga yangi parol berish',
    description:
      'Ikki holatda ishlatiladi: xodim parolni unutgan yoki admin unga ' +
      'yangi parol bermoqchi.\n\n' +
      '`password` berilsa — AYNAN o‘sha parol o‘rnatiladi; bo‘sh ' +
      'qoldirilsa tizim tasodifiy parol yaratadi. Ikkala holatda ham ' +
      'javobda ochiq matnda qaytadi (bazada faqat hash).\n\n' +
      '⚠ Xodim parolni keyin o‘zi almashtira olmaydi — unda majburiy ' +
      'almashtirish oqimi yo‘q (u faqat optom mijozda bor). Shuning ' +
      'uchun parolni admin xodimga shaxsan yetkazadi.\n\n' +
      '🔒 Filial admini faqat O‘Z filiali menejeriga parol bera oladi — begona filial menejeri uchun 404.\n\n' +
      '⚠ Eski tokenlar darhol o‘chmaydi: xodim qo‘lidagi access token ' +
      'muddati tugaguncha (15 daqiqa) ishlashda davom etadi.',
  })
  @ApiParam({ name: 'id', description: 'Menejer ID' })
  @ApiDataResponse(StaffPasswordResetDto, { description: 'Yangi parol' })
  @ApiBadRequestResponse({
    description: 'Parol juda qisqa (kamida 8 belgi)',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Menejer topilmadi yoki boshqa filialniki',
    type: ApiErrorDto,
  })
  resetPassword(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: ResetStaffPasswordDto,
  ): Promise<StaffPasswordResetDto> {
    return this.staff.resetPassword(actor, 'MANAGER', id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Menejerni tahrirlash',
    description:
      '`isActive: false` — kira olmaydi va unga yangi buyurtma biriktirilmaydi ' +
      '(biriktirilgan mijozlar saqlanadi). Filialga o‘tkazish — SUPER_ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'Menejer ID' })
  @ApiDataResponse(StaffDto, { description: 'Yangilandi' })
  @ApiBadRequestResponse({
    description: 'Maydon xato yoki filial mos emas',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filial',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({ description: 'Telefon band', type: ApiErrorDto })
  update(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffDto> {
    return this.staff.update(actor, 'MANAGER', id, dto);
  }
}
