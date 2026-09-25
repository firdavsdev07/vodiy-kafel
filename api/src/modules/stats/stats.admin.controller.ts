import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentActor, Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { DailyStatsDto, DailyStatsQueryDto, DashboardStatsDto } from './dto';
import { StatsService } from './stats.service';

/**
 * Bosh sahifa statistikasi (B-063).
 *
 * Hamma xodim roli uchun ochiq — raqamlar baribir o'z filiali kesimida
 * va xodim bu ro'yxatlarni allaqachon ko'ra oladi (`orders.manage`,
 * `customers.manage`, `stock.view` — hammasi ALL_STAFF).
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.BRANCH_ADMIN,
  UserRole.MANAGER,
  UserRole.MODERATOR,
)
@ApiBearerAuth(BEARER_AUTH)
@ApiUnauthorizedResponse({
  description: 'Token yo‘q, muddati o‘tgan yoki hisob faol emas',
  type: ApiErrorDto,
})
@ApiForbiddenResponse({ description: 'Xodim tokeni emas', type: ApiErrorDto })
export class StatsAdminController {
  constructor(private readonly stats: StatsService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Bosh sahifa ko‘rsatkichlari',
    description:
      'BITTA so‘rovda: yangi / tezkor / to‘lanmagan buyurtmalar, bugungi ' +
      'va oylik buyurtma soni + summa, kam qolgan va tugagan mahsulotlar, ' +
      'faol va qarzdor mijozlar.\n\n' +
      '⚠ Har bir son mavjud admin ro‘yxatining AYNAN o‘sha filtri bilan ' +
      'hisoblanadi — kartochkani bosgan xodim ro‘yxatda boshqa sonni ' +
      'ko‘rmaydi.\n\n' +
      '🔒 Filial: cheklangan rol uchun HAR DOIM o‘z filiali (so‘rovdagi ' +
      '`branchId` boshqa bo‘lsa 404). SUPER_ADMIN `branchId` bermasa — ' +
      'butun tizim.\n\n' +
      '⚠ Zaxira raqamlari filialga bog‘lanmagan (B-008): markaziy ombor ' +
      'zaxirasi butun tizim uchun bitta, shuning uchun ular filial ' +
      'kesimida O‘ZGARMAYDI.',
  })
  @ApiQuery({
    name: 'branchId',
    required: false,
    description: 'Faqat SUPER_ADMIN uchun kesim. Boshqa rolda 404.',
  })
  @ApiDataResponse(DashboardStatsDto, { description: 'Ko‘rsatkichlar' })
  dashboard(
    @CurrentActor() actor: Actor,
    @Query('branchId') branchId?: string,
  ): Promise<DashboardStatsDto> {
    return this.stats.dashboard(actor, branchId);
  }

  @Get('daily')
  @ApiOperation({
    summary: 'Kunlik statistika (chart)',
    description:
      'T-010: davr — sana VA soat bilan (`from` kiradi, `to` kirmaydi), ' +
      'eng ko‘pi 12 oy. Kunlar Toshkent vaqti bo‘yicha; bo‘sh kunlar ham ' +
      'nol bilan. Har kun: buyurtmalar soni va summasi (bekor ' +
      'qilinmaganlari), bekor qilingan, yetkazilgan, tushgan to‘lovlar, ' +
      'yangi mijozlar; `totals` — butun davr.\n\n' +
      '🔒 Doira buyurtmalar ro‘yxati bilan bir xil: SUPER_ADMIN va ' +
      'MODERATOR — barcha filial (`branchId` bilan toraytiriladi), filial ' +
      'xodimi — o‘z filiali.',
  })
  @ApiDataResponse(DailyStatsDto, { description: 'Kunlar va jami' })
  @ApiBadRequestResponse({
    description: 'Sana noto‘g‘ri, boshi oxiridan keyin yoki davr 12 oydan uzun',
    type: ApiErrorDto,
  })
  daily(
    @CurrentActor() actor: Actor,
    @Query() query: DailyStatsQueryDto,
  ): Promise<DailyStatsDto> {
    return this.stats.daily(actor, query);
  }
}
