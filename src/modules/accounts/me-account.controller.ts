import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentActor } from '../../auth/decorators';
import {
  CustomerOnlyGuard,
  JwtAuthGuard,
  PasswordChangeRequiredGuard,
} from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { AccountsService } from './accounts.service';
import {
  AccountSummaryDto,
  AccountTransactionDto,
  AccountTransactionQueryDto,
} from './dto';

const PaginatedTransactions = PaginatedResponseDto(AccountTransactionDto);

/**
 * Optom mijoz kabineti — hisob (B-035, TZ 3.11).
 *
 * 🔒 Faqat o'z hisobi: mijoz ID si tokendan, so'rovda umuman yo'q.
 */
@ApiTags(SwaggerTag.Customers)
@Controller('me/account')
@UseGuards(JwtAuthGuard, CustomerOnlyGuard, PasswordChangeRequiredGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiUnauthorizedResponse({
  description: 'Token yo‘q, muddati o‘tgan yoki hisob faol emas',
  type: ApiErrorDto,
})
@ApiForbiddenResponse({
  description:
    'Optom mijoz tokeni emas yoki vaqtinchalik parol almashtirilmagan',
  type: ApiErrorDto,
})
export class MeAccountController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @ApiOperation({
    summary: 'Mening hisobim',
    description:
      'Jami xarid, jami to‘langan va qarz. Qarz manfiy bo‘lsa — avans.',
  })
  @ApiDataResponse(AccountSummaryDto, { description: 'Hisob' })
  getMine(@CurrentActor() actor: Actor): Promise<AccountSummaryDto> {
    return this.accounts.getMine(actor);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Hisob harakatlari tarixi',
    description:
      'Har bir qarz, to‘lov va tuzatish — alohida yozuv. Standart: ' +
      'yangilari birinchi (`sortOrder=asc` — eskilari).',
  })
  @ApiDataResponse(PaginatedTransactions, { description: 'Sahifalangan' })
  findMine(
    @CurrentActor() actor: Actor,
    @Query() query: AccountTransactionQueryDto,
  ): Promise<PaginatedResult<AccountTransactionDto>> {
    return this.accounts.findMineTransactions(actor, query);
  }
}
