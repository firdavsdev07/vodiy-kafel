import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
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
import { MAX_UPLOAD_BYTES, type UploadedFileData } from '../../storage';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { AnnouncementsService } from './announcements.service';
import {
  AnnouncementDto,
  AnnouncementQueryDto,
  CreateAnnouncementDto,
} from './dto/announcement.dto';

const PaginatedAnnouncements = PaginatedResponseDto(AnnouncementDto);

/**
 * Mijozlarga oddiy xabar — bayram, e'lon (T-009).
 *
 * 🔒 Barcha xodim yuboradi, lekin DOIRA har xil (servisda):
 *    SUPER_ADMIN / MODERATOR — hamma mijoz, BRANCH_ADMIN — o'z filiali,
 *    MANAGER — faqat o'ziga biriktirilgan mijozlar.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.MODERATOR,
  UserRole.BRANCH_ADMIN,
  UserRole.MANAGER,
)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({ description: 'Faqat xodim', type: ApiErrorDto })
export class AnnouncementsAdminController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Mijozlarga xabar yuborish (rasm + matn)',
    description:
      '`multipart/form-data`: `title` (ixtiyoriy), `body`, `audience` ' +
      '(`ALL` | `SELECTED`), `customerIds` (SELECTED da), `image` ' +
      '(ixtiyoriy, bitta: JPG/PNG/WEBP, 10 MB gacha).\n\n' +
      'Har qabul qiluvchi kabinetida `ANNOUNCEMENT` bildirishnomasi: rasm ' +
      'va uning OSTIDA matn.\n\n' +
      '🔒 `ALL` — sizning DOIRANGIZDAGI barcha faol mijozlar: SUPER_ADMIN ' +
      'va MODERATOR — hammasi, BRANCH_ADMIN — o‘z filiali, MANAGER — faqat ' +
      'o‘ziga biriktirilganlar. `SELECTED` da doiradan tashqari bitta mijoz ' +
      'bo‘lsa ham — 404 va hech kimga yuborilmaydi.',
  })
  @ApiDataResponse(AnnouncementDto, { status: 201, description: 'Yuborildi' })
  @ApiBadRequestResponse({
    description:
      'Maydon noto‘g‘ri, rasm turi mos emas yoki qabul qiluvchi yo‘q',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Tanlangan mijoz topilmadi yoki sizning doirangizda emas',
    type: ApiErrorDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'Rasm 10 MB dan katta',
    type: ApiErrorDto,
  })
  create(
    @CurrentActor() actor: Actor,
    @Body() dto: CreateAnnouncementDto,
    @UploadedFile() image: UploadedFileData | undefined,
  ): Promise<AnnouncementDto> {
    return this.announcements.create(actor, dto, image);
  }

  @Get()
  @ApiOperation({
    summary: 'Yuborilgan xabarlar',
    description:
      'SUPER_ADMIN va MODERATOR — barcha xabarlar; boshqa xodim — faqat ' +
      'o‘zi yuborganlari. Yangilari birinchi.',
  })
  @ApiDataResponse(PaginatedAnnouncements, { description: 'Sahifalangan' })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: AnnouncementQueryDto,
  ): Promise<PaginatedResult<AnnouncementDto>> {
    return this.announcements.findAll(actor, query);
  }
}
