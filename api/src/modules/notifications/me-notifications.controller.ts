import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentActor } from '../../auth/decorators';
import { JwtAuthGuard, PasswordChangeRequiredGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import {
  NotificationDto,
  NotificationQueryDto,
  ReadAllResponseDto,
  UnreadCountDto,
} from './dto/notification.dto';
import { NotificationsInboxService } from './notifications-inbox.service';

const PaginatedNotifications = PaginatedResponseDto(NotificationDto);

/**
 * Bildirishnomalar (B-038). Optom mijoz tokeni ham, xodim tokeni ham —
 * har biri faqat O'Z qutisini ko'radi.
 */
@ApiTags(SwaggerTag.Notifications)
@Controller('me/notifications')
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
export class MeNotificationsController {
  constructor(private readonly inbox: NotificationsInboxService) {}

  @Get()
  @ApiOperation({
    summary: 'Mening bildirishnomalarim',
    description:
      'Yangilari birinchi. `isRead=false` — faqat o‘qilmaganlar.\n\n' +
      'Mijoz ham, xodim (admin panel) ham shu endpointdan foydalanadi.',
  })
  @ApiDataResponse(PaginatedNotifications, { description: 'Sahifalangan' })
  findMine(
    @CurrentActor() actor: Actor,
    @Query() query: NotificationQueryDto,
  ): Promise<PaginatedResult<NotificationDto>> {
    return this.inbox.findMine(actor, query);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'O‘qilmaganlar soni',
    description: 'Header’dagi «+1» hisoblagichi uchun (TZ 3.6).',
  })
  @ApiDataResponse(UnreadCountDto, { description: 'Soni' })
  unreadCount(@CurrentActor() actor: Actor): Promise<UnreadCountDto> {
    return this.inbox.unreadCount(actor);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Hammasini o‘qilgan deb belgilash' })
  @ApiDataResponse(ReadAllResponseDto, { description: 'Belgilandi' })
  markAllRead(@CurrentActor() actor: Actor): Promise<ReadAllResponseDto> {
    return this.inbox.markAllRead(actor);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'O‘qilgan deb belgilash',
    description: 'Takror chaqirish xavfsiz — o‘qilgan vaqt o‘zgarmaydi.',
  })
  @ApiParam({ name: 'id', description: 'Bildirishnoma ID' })
  @ApiDataResponse(NotificationDto, { description: 'Belgilandi' })
  @ApiNotFoundResponse({
    description: 'Topilmadi (yoki boshqa foydalanuvchiniki)',
    type: ApiErrorDto,
  })
  markRead(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<NotificationDto> {
    return this.inbox.markRead(actor, id);
  }
}
