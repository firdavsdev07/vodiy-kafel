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
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { CurrentActor } from '../../auth/decorators/current-actor.decorator';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { CustomersAdminService } from './customers-admin.service';
import { CustomersService } from './customers.service';
import {
  AdminCustomerDetailDto,
  AdminCustomerListItemDto,
  AdminCustomerQueryDto,
  CreateCustomerDto,
  CustomerCreatedResponseDto,
  ResetPasswordResponseDto,
  SetCustomerActiveDto,
  UpdateCustomerDto,
} from './dto';

const PaginatedAdminCustomers = PaginatedResponseDto(AdminCustomerListItemDto);

const ALL_STAFF = [
  UserRole.SUPER_ADMIN,
  UserRole.BRANCH_ADMIN,
  UserRole.MANAGER,
  UserRole.MODERATOR,
];

/**
 * Optom mijozlarni boshqarish — xodimlar uchun (B-017 parol, B-036 CRUD).
 *
 * Yaratish/tahrirlash — barcha xodim (TZ: hisobni filial admini YOKI
 * menejeri ochadi). Hisobni o'chirish/yoqish — admin va moderator.
 * 🔒 Filial izolyatsiyasi servisda: begona filial mijozi — 404.
 *    MODERATOR mijozlar domenida barcha filialni ko'radi (T-001).
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
export class CustomersAdminController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customersAdmin: CustomersAdminService,
  ) {}

  @Get()
  @Roles(...ALL_STAFF)
  @ApiOperation({
    summary: 'Optom mijozlar ro‘yxati',
    description:
      'Qidiruv (login / kompaniya / kontakt / telefon / INN), qarzdorlik, ' +
      'filial, menejer, faollik bo‘yicha filtr. Har qatorda joriy balans.\n\n' +
      '🔒 Filial xodimi faqat o‘z filialini ko‘radi; SUPER_ADMIN va ' +
      'MODERATOR hamma filialni ko‘radi va `branchId` bilan filtrlaydi.',
  })
  @ApiDataResponse(PaginatedAdminCustomers, { description: 'Sahifalangan' })
  @ApiNotFoundResponse({
    description: 'Boshqa filial so‘raldi',
    type: ApiErrorDto,
  })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: AdminCustomerQueryDto,
  ): Promise<PaginatedResult<AdminCustomerListItemDto>> {
    return this.customersAdmin.findAll(actor, query);
  }

  @Get(':id')
  @Roles(...ALL_STAFF)
  @ApiOperation({
    summary: 'Mijoz kartasi',
    description:
      'Profil + hisob (balans) + oxirgi buyurtmalar + oxirgi hisob harakatlari.',
  })
  @ApiParam({ name: 'id', description: 'Mijoz ID' })
  @ApiDataResponse(AdminCustomerDetailDto, { description: 'Mijoz' })
  @ApiNotFoundResponse({
    description: 'Mijoz topilmadi yoki boshqa filialniki',
    type: ApiErrorDto,
  })
  findOne(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<AdminCustomerDetailDto> {
    return this.customersAdmin.findOne(actor, id);
  }

  @Post()
  @Roles(...ALL_STAFF)
  @ApiOperation({
    summary: 'Optom mijoz hisobini ochish',
    description:
      'Hisob yaratiladi va VAQTINCHALIK PAROL qaytadi.\n\n' +
      '⚠ Parol FAQAT shu javobda ko‘rinadi — mijozga telefon/Telegram ' +
      'orqali yetkazing. Birinchi kirishda almashtiriladi.\n\n' +
      '🔒 Filial xodimi faqat O‘Z filialiga yaratadi; SUPER_ADMIN va ' +
      'MODERATOR `branchId` ni aniq beradi.\n\n' +
      'T-007: menejer AVTOMATIK biriktirilmaydi (yaratgan menejerga ham) — ' +
      'faqat aniq `managerId` yoki keyin kartada.',
  })
  @ApiDataResponse(CustomerCreatedResponseDto, {
    status: 201,
    description: 'Yaratildi',
  })
  @ApiBadRequestResponse({
    description:
      'Maydon noto‘g‘ri, SUPER_ADMIN filial bermagan, filial faol emas ' +
      'yoki menejer bu filialniki emas',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Boshqa filial ko‘rsatildi',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({ description: 'Login band', type: ApiErrorDto })
  create(
    @CurrentActor() actor: Actor,
    @Body() dto: CreateCustomerDto,
  ): Promise<CustomerCreatedResponseDto> {
    return this.customersAdmin.create(actor, dto);
  }

  @Patch(':id')
  @Roles(...ALL_STAFF)
  @ApiOperation({
    summary: 'Mijoz ma’lumotlarini tahrirlash',
    description:
      'Login o‘zgarmaydi. `inn: null` / `managerId: null` — tozalash.\n\n' +
      '🔒 Boshqa filialga ko‘chirish — SUPER_ADMIN va MODERATOR (mijoz narxi ' +
      'o‘zgaradi!). Ko‘chirilganda eski filial menejeri uziladi.',
  })
  @ApiParam({ name: 'id', description: 'Mijoz ID' })
  @ApiDataResponse(AdminCustomerDetailDto, { description: 'Yangilandi' })
  @ApiBadRequestResponse({
    description: 'Maydon noto‘g‘ri yoki menejer bu filialniki emas',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Mijoz topilmadi yoki boshqa filialniki',
    type: ApiErrorDto,
  })
  update(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<AdminCustomerDetailDto> {
    return this.customersAdmin.update(actor, id, dto);
  }

  @Patch(':id/active')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.MODERATOR)
  @ApiOperation({
    summary: 'Hisobni o‘chirish / yoqish',
    description:
      '`false` — mijoz kira olmaydi va buyurtma bera olmaydi. Buyurtmalar, ' +
      'balans va tarix saqlanadi.',
  })
  @ApiParam({ name: 'id', description: 'Mijoz ID' })
  @ApiDataResponse(AdminCustomerDetailDto, { description: 'Yangilandi' })
  @ApiNotFoundResponse({
    description: 'Mijoz topilmadi yoki boshqa filialniki',
    type: ApiErrorDto,
  })
  setActive(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: SetCustomerActiveDto,
  ): Promise<AdminCustomerDetailDto> {
    return this.customersAdmin.setActive(actor, id, dto.isActive);
  }

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
