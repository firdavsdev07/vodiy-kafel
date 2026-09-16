import {
  Body,
  Controller,
  Delete,
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
  StaffCreatedDto,
  StaffDto,
  StaffQueryDto,
  UpdateStaffDto,
} from './dto/staff.dto';
import { StaffAdminService } from './staff-admin.service';

/**
 * Moderatorlar — markaziy ombor xodimlari (B-057, TZ 3.7.2).
 *
 * 🔒 Faqat SUPER_ADMIN. Moderator faqat CENTRAL filialga biriktiriladi —
 *    RETAIL berilsa 400 (jadvallararo qoida, dastur darajasida).
 */
@ApiTags(SwaggerTag.Moderators)
@Controller('admin/moderators')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({ description: 'Faqat SUPER_ADMIN', type: ApiErrorDto })
export class ModeratorsAdminController {
  constructor(private readonly staff: StaffAdminService) {}

  @Get()
  @ApiOperation({
    summary: 'Moderatorlar',
    description: 'Filtr: markaziy ombor, holat, qidiruv.',
  })
  @ApiDataResponse(StaffDto, { isArray: true, description: 'Moderatorlar' })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: StaffQueryDto,
  ): Promise<StaffDto[]> {
    return this.staff.findAll(actor, 'MODERATOR', query);
  }

  @Post()
  @ApiOperation({
    summary: 'Moderator qo‘shish',
    description:
      '`branchId` — CENTRAL filial (majburiy). Kirish: telefon + ' +
      'vaqtinchalik parol (javobda FAQAT bir marta).',
  })
  @ApiDataResponse(StaffCreatedDto, { status: 201, description: 'Qo‘shildi' })
  @ApiBadRequestResponse({
    description: 'Maydon xato, filial berilmagan/yopiq yoki CENTRAL emas',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({ description: 'Telefon band', type: ApiErrorDto })
  create(
    @CurrentActor() actor: Actor,
    @Body() dto: CreateStaffDto,
  ): Promise<StaffCreatedDto> {
    return this.staff.create(actor, 'MODERATOR', dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Moderatorni tahrirlash',
    description: 'Boshqa markaziy omborga o‘tkazish — `branchId` (CENTRAL).',
  })
  @ApiParam({ name: 'id', description: 'Moderator ID' })
  @ApiDataResponse(StaffDto, { description: 'Yangilandi' })
  @ApiBadRequestResponse({
    description: 'Maydon xato yoki filial CENTRAL emas',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  @ApiConflictResponse({ description: 'Telefon band', type: ApiErrorDto })
  update(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffDto> {
    return this.staff.update(actor, 'MODERATOR', id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Moderatorni o‘chirish (soft)',
    description:
      'Kira olmaydi. Hisob o‘chirilmaydi — u o‘zgartirgan holatlar va ' +
      'zaxira tarixi saqlanadi. Qaytarish — `PATCH { "isActive": true }`.',
  })
  @ApiParam({ name: 'id', description: 'Moderator ID' })
  @ApiDataResponse(StaffDto, { description: 'O‘chirildi' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  remove(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<StaffDto> {
    return this.staff.deactivate(actor, 'MODERATOR', id);
  }
}
