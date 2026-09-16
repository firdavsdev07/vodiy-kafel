import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
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
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { DeliveryAdminService } from './delivery-admin.service';
import {
  CreateRegionDto,
  CreateTransportTypeDto,
  ReferenceQueryDto,
  RegionAdminDto,
  TariffAdminDto,
  TariffQueryDto,
  TransportTypeAdminDto,
  UpdateRegionDto,
  UpdateTariffPriceDto,
  UpdateTransportTypeDto,
  UpsertTariffDto,
} from './dto';

const PaginatedTariffs = PaginatedResponseDto(TariffAdminDto);

const ALL_STAFF = [
  UserRole.SUPER_ADMIN,
  UserRole.BRANCH_ADMIN,
  UserRole.MANAGER,
  UserRole.MODERATOR,
];

/**
 * Transport turlari, viloyatlar va tarif matritsasi — admin (B-056).
 *
 * Ko'rish — barcha xodim. Ma'lumotnomalarni yozish — SUPER_ADMIN.
 * Tarif narxini yozish — SUPER_ADMIN va filial admini (o'z filiali);
 * menejer va moderator narx qo'ymaydi (B-021 bilan bir xil qoida).
 */
@ApiTags(SwaggerTag.Delivery)
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class DeliveryAdminController {
  constructor(private readonly delivery: DeliveryAdminService) {}

  // — Transport turlari —

  @Get('transport-types')
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'Transport turlari (nofaollari bilan)' })
  @ApiDataResponse(TransportTypeAdminDto, {
    isArray: true,
    description: 'Ro‘yxat',
  })
  findTransportTypes(
    @Query() query: ReferenceQueryDto,
  ): Promise<TransportTypeAdminDto[]> {
    return this.delivery.findTransportTypes(query);
  }

  @Post('transport-types')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Transport turi qo‘shish' })
  @ApiDataResponse(TransportTypeAdminDto, {
    status: 201,
    description: 'Qo‘shildi',
  })
  @ApiBadRequestResponse({
    description: 'Maydonlar noto‘g‘ri',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({ description: 'Nom band', type: ApiErrorDto })
  createTransportType(
    @Body() dto: CreateTransportTypeDto,
  ): Promise<TransportTypeAdminDto> {
    return this.delivery.createTransportType(dto);
  }

  @Patch('transport-types/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Transport turini tahrirlash',
    description: 'Sig‘im o‘zgarsa — faqat yangi hisoblarga ta’sir qiladi.',
  })
  @ApiParam({ name: 'id', description: 'Transport turi ID' })
  @ApiDataResponse(TransportTypeAdminDto, { description: 'Yangilandi' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  @ApiConflictResponse({ description: 'Nom band', type: ApiErrorDto })
  updateTransportType(
    @Param('id') id: string,
    @Body() dto: UpdateTransportTypeDto,
  ): Promise<TransportTypeAdminDto> {
    return this.delivery.updateTransportType(id, dto);
  }

  @Delete('transport-types/:id')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Transport turini o‘chirish (soft)',
    description:
      'Tanlovda ko‘rinmaydi, u bilan hisoblab bo‘lmaydi. Eski buyurtmalar ' +
      'saqlanadi. Qaytarish — `PATCH { "isActive": true }`.',
  })
  @ApiParam({ name: 'id', description: 'Transport turi ID' })
  @ApiDataResponse(TransportTypeAdminDto, { description: 'O‘chirildi' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  removeTransportType(@Param('id') id: string): Promise<TransportTypeAdminDto> {
    return this.delivery.deactivateTransportType(id);
  }

  // — Viloyatlar —

  @Get('regions')
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'Viloyatlar (nofaollari bilan)' })
  @ApiDataResponse(RegionAdminDto, { isArray: true, description: 'Ro‘yxat' })
  findRegions(@Query() query: ReferenceQueryDto): Promise<RegionAdminDto[]> {
    return this.delivery.findRegions(query);
  }

  @Post('regions')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Viloyat qo‘shish' })
  @ApiDataResponse(RegionAdminDto, { status: 201, description: 'Qo‘shildi' })
  @ApiBadRequestResponse({
    description: 'Maydonlar noto‘g‘ri',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({ description: 'Nom band', type: ApiErrorDto })
  createRegion(@Body() dto: CreateRegionDto): Promise<RegionAdminDto> {
    return this.delivery.createRegion(dto);
  }

  @Patch('regions/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Viloyatni tahrirlash' })
  @ApiParam({ name: 'id', description: 'Viloyat ID' })
  @ApiDataResponse(RegionAdminDto, { description: 'Yangilandi' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  @ApiConflictResponse({ description: 'Nom band', type: ApiErrorDto })
  updateRegion(
    @Param('id') id: string,
    @Body() dto: UpdateRegionDto,
  ): Promise<RegionAdminDto> {
    return this.delivery.updateRegion(id, dto);
  }

  @Delete('regions/:id')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Viloyatni o‘chirish (soft)',
    description: 'Qaytarish — `PATCH { "isActive": true }`.',
  })
  @ApiParam({ name: 'id', description: 'Viloyat ID' })
  @ApiDataResponse(RegionAdminDto, { description: 'O‘chirildi' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  removeRegion(@Param('id') id: string): Promise<RegionAdminDto> {
    return this.delivery.deactivateRegion(id);
  }

  // — Tariflar —

  @Get('tariffs')
  @Roles(...ALL_STAFF)
  @ApiOperation({
    summary: 'Tarif matritsasi (filial × viloyat × transport)',
    description: '🔒 Filial xodimi faqat o‘z filiali tariflarini ko‘radi.',
  })
  @ApiDataResponse(PaginatedTariffs, { description: 'Sahifalangan' })
  @ApiNotFoundResponse({
    description: 'Boshqa filial so‘raldi',
    type: ApiErrorDto,
  })
  findTariffs(
    @CurrentActor() actor: Actor,
    @Query() query: TariffQueryDto,
  ): Promise<PaginatedResult<TariffAdminDto>> {
    return this.delivery.findTariffs(actor, query);
  }

  @Put('tariffs')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
  @ApiOperation({
    summary: 'Tarif o‘rnatish (bor bo‘lsa yangilanadi)',
    description:
      '🔒 Filial admini — faqat o‘z filialiga (`branchId` bermasa ham ' +
      'bo‘ladi); SUPER_ADMIN — `branchId` majburiy.',
  })
  @ApiDataResponse(TariffAdminDto, { description: 'Saqlandi' })
  @ApiBadRequestResponse({
    description:
      'Narx noto‘g‘ri, viloyat/transport topilmadi yoki SUPER_ADMIN filial bermagan',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Filial topilmadi yoki boshqa filial',
    type: ApiErrorDto,
  })
  upsertTariff(
    @CurrentActor() actor: Actor,
    @Body() dto: UpsertTariffDto,
  ): Promise<TariffAdminDto> {
    return this.delivery.upsertTariff(actor, dto);
  }

  @Patch('tariffs/:id/price')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Tarif narxini o‘zgartirish' })
  @ApiParam({ name: 'id', description: 'Tarif ID' })
  @ApiDataResponse(TariffAdminDto, { description: 'Yangilandi' })
  @ApiBadRequestResponse({ description: 'Narx noto‘g‘ri', type: ApiErrorDto })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filial',
    type: ApiErrorDto,
  })
  updateTariffPrice(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: UpdateTariffPriceDto,
  ): Promise<TariffAdminDto> {
    return this.delivery.updateTariffPrice(actor, id, dto);
  }
}
