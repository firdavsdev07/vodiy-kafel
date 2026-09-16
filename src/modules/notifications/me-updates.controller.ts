import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentActor } from '../../auth/decorators';
import { JwtAuthGuard, PasswordChangeRequiredGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { UpdatesQueryDto, UpdatesResponseDto } from './dto/updates.dto';
import { UpdatesService } from './updates.service';

/**
 * Real-vaqt kuzatuv — polling (B-039). Mijoz — o'z buyurtmalari; xodim —
 * filial doirasidagi buyurtmalar.
 */
@ApiTags(SwaggerTag.Notifications)
@Controller('me/updates')
@UseGuards(JwtAuthGuard, PasswordChangeRequiredGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiUnauthorizedResponse({
  description: 'Token yo‘q, muddati o‘tgan yoki hisob faol emas',
  type: ApiErrorDto,
})
@ApiForbiddenResponse({
  description: 'Vaqtinchalik parol almashtirilmagan',
  type: ApiErrorDto,
})
export class MeUpdatesController {
  constructor(private readonly updates: UpdatesService) {}

  @Get()
  @ApiOperation({
    summary: 'O‘zgarishlar (polling, ~15 soniyada)',
    description:
      'Birinchi chaqiriq — `since` siz: faqat `unreadCount` va ' +
      '`serverTime`. Keyingilari — `since` = oldingi `serverTime`.\n\n' +
      'Javob: `since` dan keyin holati/to‘lovi o‘zgargan buyurtmalar (qisqa), ' +
      'yangi bildirishnomalar, o‘qilmaganlar soni. `truncated: true` — ' +
      'sahifani to‘liq yangilang.',
  })
  @ApiDataResponse(UpdatesResponseDto, { description: 'O‘zgarishlar' })
  @ApiBadRequestResponse({
    description: '`since` ISO-8601 emas yoki kelajakda',
    type: ApiErrorDto,
  })
  getUpdates(
    @CurrentActor() actor: Actor,
    @Query() query: UpdatesQueryDto,
  ): Promise<UpdatesResponseDto> {
    return this.updates.getUpdates(actor, query.since);
  }
}
