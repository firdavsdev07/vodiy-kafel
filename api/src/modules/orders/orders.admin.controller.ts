import {
  Body,
  Controller,
  Get,
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
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import {
  AdminOrderDetailDto,
  AdminOrderListItemDto,
  AdminOrderQueryDto,
  AssignableStaffDto,
  AssignOrderManagerDto,
  ChangeOrderStatusDto,
  CreateManualOrderDto,
  OrderStatusChangeResponseDto,
  SetOrderUrgentDto,
} from './dto';
import { OrderStatusService } from './order-status.service';
import { OrdersAdminService } from './orders-admin.service';

const PaginatedAdminOrders = PaginatedResponseDto(AdminOrderListItemDto);

const ALL_STAFF = [
  UserRole.SUPER_ADMIN,
  UserRole.BRANCH_ADMIN,
  UserRole.MANAGER,
  UserRole.MODERATOR,
] as const;

/**
 * Buyurtmalar — admin (B-029; ro'yxat va boshqaruv — B-030).
 *
 * 🔒 Filial izolyatsiyasi servisda: xodim faqat o'z filiali buyurtmasini
 *    o'zgartiradi, begonasi — 404.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class OrdersAdminController {
  constructor(
    private readonly orderStatus: OrderStatusService,
    private readonly ordersAdmin: OrdersAdminService,
  ) {}

  @Get()
  @Roles(...ALL_STAFF)
  @ApiOperation({
    summary: 'Buyurtmalar ro‘yxati',
    description:
      'Filtrlar: holat, manba, tezkor, to‘lov holati, filial, menejer, sana ' +
      'oralig‘i, qidiruv (raqam / kompaniya / ism / telefon).\n\n' +
      '🔒 Xodim faqat o‘z filialini ko‘radi; SUPER_ADMIN `branchId` bilan ' +
      'filtrlaydi.',
  })
  @ApiDataResponse(PaginatedAdminOrders, { description: 'Sahifalangan' })
  @ApiBadRequestResponse({
    description: 'Filtr noto‘g‘ri (masalan dateFrom ≥ dateTo)',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Boshqa filial so‘raldi',
    type: ApiErrorDto,
  })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: AdminOrderQueryDto,
  ): Promise<PaginatedResult<AdminOrderListItemDto>> {
    return this.ordersAdmin.findAll(actor, query);
  }

  @Post()
  @Roles(...ALL_STAFF)
  @ApiOperation({
    summary: 'Buyurtmani qo‘lda kiritish (telefon / Telegram)',
    description:
      'Xaridor: `customerId` (hisobi bor mijoz) YOKI `guestName` + ' +
      '`guestPhone`.\n\n' +
      '🔒 Narx backendda: mijozda — uning filiali narxi va shaxsiy ' +
      'qoidalari; hisobsiz xaridorda — filial bazaviy narxi. Zaxira ' +
      'tekshiruvi mijoz buyurtmasi bilan bir xil.\n\n' +
      'Menejer kiritsa — buyurtma unga biriktiriladi.',
  })
  @ApiDataResponse(AdminOrderDetailDto, {
    status: 201,
    description: 'Buyurtma yaratildi',
  })
  @ApiBadRequestResponse({
    description: 'Xaridor noto‘g‘ri ko‘rsatilgan yoki buyurtma tarkibi xato',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Mijoz/filial/mahsulot topilmadi yoki boshqa filialniki',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Omborda yetarli emas',
    type: ApiErrorDto,
  })
  createManual(
    @CurrentActor() actor: Actor,
    @Body() dto: CreateManualOrderDto,
  ): Promise<AdminOrderDetailDto> {
    return this.ordersAdmin.createManual(actor, dto);
  }

  @Get(':id')
  @Roles(...ALL_STAFF)
  @ApiOperation({
    summary: 'Buyurtma tafsiloti',
    description:
      'Tarkib, holatlar tarixi (kim o‘zgartirgani bilan), to‘lovlar.',
  })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(AdminOrderDetailDto, { description: 'Buyurtma' })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filialga tegishli',
    type: ApiErrorDto,
  })
  findOne(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<AdminOrderDetailDto> {
    return this.ordersAdmin.findOne(actor, id);
  }

  @Patch(':id/urgent')
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'Tezkor belgisini qo‘yish / olib tashlash' })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(AdminOrderDetailDto, { description: 'Yangilangan buyurtma' })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filialga tegishli',
    type: ApiErrorDto,
  })
  setUrgent(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: SetOrderUrgentDto,
  ): Promise<AdminOrderDetailDto> {
    return this.ordersAdmin.setUrgent(actor, id, dto.isUrgent);
  }

  @Get(':id/assignable-staff')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.MODERATOR)
  @ApiOperation({
    summary: 'Biriktirish uchun nomzod xodimlar',
    description:
      'Buyurtma FILIALINING faol xodimlari — aynan biriktirish qabul ' +
      'qiladigan rollar (MANAGER, BRANCH_ADMIN, MODERATOR).\n\n' +
      '⚠ Rollar ro‘yxati `PATCH /admin/orders/{id}/assign` bilan BITTA ' +
      'manbadan (`ASSIGNABLE_ROLES`): ro‘yxatda ko‘rinadigan har bir ' +
      'xodimga biriktirish ishlaydi.\n\n' +
      '🔒 Filial buyurtmadan olinadi, so‘rovdan EMAS — begona filial ' +
      'buyurtmasi so‘ralsa 404. Filialsiz buyurtma uchun bo‘sh ro‘yxat.\n\n' +
      '⚠ `@Roles` aynan `assign` bilan bir xil: ro‘yxatni faqat ' +
      'biriktira oladigan xodim ko‘radi.',
  })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(AssignableStaffDto, {
    isArray: true,
    description: 'Nomzodlar',
  })
  @ApiNotFoundResponse({
    description: 'Buyurtma topilmadi yoki boshqa filialga tegishli',
    type: ApiErrorDto,
  })
  assignableStaff(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<AssignableStaffDto[]> {
    return this.ordersAdmin.assignableStaff(actor, id);
  }

  @Patch(':id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.MODERATOR)
  @ApiOperation({
    summary: 'Buyurtmaga xodim biriktirish',
    description:
      'Xodim buyurtma filialining faol xodimi (MANAGER, BRANCH_ADMIN yoki ' +
      'MODERATOR) bo‘lishi shart. `managerId: null` — biriktirishni olib ' +
      'tashlash.',
  })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(AdminOrderDetailDto, { description: 'Yangilangan buyurtma' })
  @ApiBadRequestResponse({
    description: 'Xodim topilmadi, faol emas yoki boshqa filialda',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filialga tegishli',
    type: ApiErrorDto,
  })
  assign(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: AssignOrderManagerDto,
  ): Promise<AdminOrderDetailDto> {
    return this.ordersAdmin.assign(actor, id, dto.managerId);
  }

  @Patch(':id/status')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
    UserRole.MODERATOR,
  )
  @ApiOperation({
    summary: 'Buyurtma holatini o‘zgartirish',
    description:
      'Yetkazib berish: `NEW → SEARCHING_TRANSPORT → LOADING → DELIVERING → ' +
      'DELIVERED`.\n\n' +
      'Olib ketish: `NEW → LOADING → DELIVERED`.\n\n' +
      '`CANCELLED` — yuk yo‘lga chiqquncha (NEW, SEARCHING_TRANSPORT, ' +
      'LOADING). `DELIVERED` va `CANCELLED` — yakuniy.\n\n' +
      'Har o‘zgarish tarixga yoziladi (kim, qachon, izoh). Javobdagi ' +
      '`allowedNextStatuses` — keyingi tugmalar uchun.\n\n' +
      '🔒 Faqat o‘z filiali buyurtmasi (SUPER_ADMIN — hammasi).',
  })
  @ApiParam({ name: 'id', description: 'Buyurtma ID' })
  @ApiDataResponse(OrderStatusChangeResponseDto, {
    description: 'Yangi holat va tarix',
  })
  @ApiBadRequestResponse({
    description: 'Ruxsat etilmagan o‘tish yoki o‘sha holat',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filialga tegishli',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Holat bir vaqtda boshqa xodim tomonidan o‘zgartirildi',
    type: ApiErrorDto,
  })
  changeStatus(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: ChangeOrderStatusDto,
  ): Promise<OrderStatusChangeResponseDto> {
    return this.orderStatus.change(actor, id, dto);
  }
}
