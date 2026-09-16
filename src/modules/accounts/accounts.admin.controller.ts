import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { AccountsService } from './accounts.service';
import {
  AccountSummaryDto,
  AccountTransactionAdminDto,
  AccountTransactionQueryDto,
  CreateAccountTransactionDto,
} from './dto';

const PaginatedAdminTransactions = PaginatedResponseDto(
  AccountTransactionAdminDto,
);

const ALL_STAFF = [
  UserRole.SUPER_ADMIN,
  UserRole.BRANCH_ADMIN,
  UserRole.MANAGER,
  UserRole.MODERATOR,
];

/**
 * Mijoz hisobi — admin (B-035).
 *
 * Ko'rish — barcha xodim; qo'lda harakat — pul vakolati: SUPER_ADMIN,
 * filial admini, moderator (markaz agentlari). MANAGER emas — to'lov
 * tasdig'i (B-034) bilan bir xil qoida.
 * 🔒 Filial izolyatsiyasi servisda: begona filial mijozi — 404.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/customers/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiParam({ name: 'id', description: 'Mijoz ID' })
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
@ApiNotFoundResponse({
  description: 'Mijoz topilmadi yoki boshqa filialniki',
  type: ApiErrorDto,
})
export class AccountsAdminController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('account')
  @Roles(...ALL_STAFF)
  @ApiOperation({ summary: 'Mijoz hisobi: jami xarid, to‘langan, qarz' })
  @ApiDataResponse(AccountSummaryDto, { description: 'Hisob' })
  getAccount(
    @CurrentActor() actor: Actor,
    @Param('id') customerId: string,
  ): Promise<AccountSummaryDto> {
    return this.accounts.getForCustomer(actor, customerId);
  }

  @Get('transactions')
  @Roles(...ALL_STAFF)
  @ApiOperation({
    summary: 'Mijoz hisob harakatlari',
    description: 'Kim kiritgani va qaysi to‘lovga bog‘liqligi bilan.',
  })
  @ApiDataResponse(PaginatedAdminTransactions, { description: 'Sahifalangan' })
  findTransactions(
    @CurrentActor() actor: Actor,
    @Param('id') customerId: string,
    @Query() query: AccountTransactionQueryDto,
  ): Promise<PaginatedResult<AccountTransactionAdminDto>> {
    return this.accounts.findForCustomer(actor, customerId, query);
  }

  @Post('transactions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN, UserRole.MODERATOR)
  @ApiOperation({
    summary: 'Qo‘lda hisob harakati',
    description:
      'Buyurtmadan tashqari qarz yoki to‘lov, yoki tuzatish.\n\n' +
      '⚠ Yozuv O‘CHIRILMAYDI va o‘zgartirilmaydi. Xato bo‘lsa — teskari ' +
      '`ADJUSTMENT` qo‘shing.\n\n' +
      'Buyurtma to‘lovlari bu yerda emas: karta — avtomatik, naqd/' +
      'o‘tkazma — `PATCH /admin/payments/{id}/confirm`.',
  })
  @ApiDataResponse(AccountSummaryDto, {
    status: 201,
    description: 'Yozildi — yangilangan hisob',
  })
  @ApiBadRequestResponse({
    description: 'Summa formati/ishorasi noto‘g‘ri yoki izoh yo‘q',
    type: ApiErrorDto,
  })
  createTransaction(
    @CurrentActor() actor: Actor,
    @Param('id') customerId: string,
    @Body() dto: CreateAccountTransactionDto,
  ): Promise<AccountSummaryDto> {
    return this.accounts.createForCustomer(actor, customerId, dto);
  }
}
