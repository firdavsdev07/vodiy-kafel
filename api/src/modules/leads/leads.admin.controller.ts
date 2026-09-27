import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import {
  LeadAdminDto,
  LeadAdminQueryDto,
  LeadNewCountDto,
  UpdateLeadDto,
} from './dto/lead.dto';
import { LeadsService } from './leads.service';

const PaginatedLeads = PaginatedResponseDto(LeadAdminDto);

/**
 * Saytdan kelgan murojaatlar (T-013). Barcha xodim; DOIRA servisda:
 * SUPER_ADMIN, MODERATOR — hammasi, BRANCH_ADMIN / MANAGER — o'z filiali.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.MODERATOR,
  UserRole.BRANCH_ADMIN,
  UserRole.MANAGER,
)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({ description: 'Faqat xodim', type: ApiErrorDto })
export class LeadsAdminController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @ApiOperation({
    summary: 'Murojaatlar ro‘yxati',
    description:
      'Yangilari birinchi (`sortOrder=desc`). 🔒 Filial xodimi faqat o‘z ' +
      'do‘koniga yozilganlarni ko‘radi; do‘kon tanlanmagan murojaat — ' +
      'faqat SUPER_ADMIN va MODERATOR ga.',
  })
  @ApiDataResponse(PaginatedLeads, { description: 'Sahifalangan' })
  @ApiNotFoundResponse({
    description: 'Begona `branchId` so‘raldi',
    type: ApiErrorDto,
  })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: LeadAdminQueryDto,
  ): Promise<PaginatedResult<LeadAdminDto>> {
    return this.leads.findAdmin(actor, query);
  }

  @Get('new-count')
  @ApiOperation({
    summary: 'Yangi murojaatlar soni',
    description: 'Menyudagi nishon uchun — doiradagi `NEW` murojaatlar.',
  })
  @ApiDataResponse(LeadNewCountDto, { description: 'Soni' })
  countNew(@CurrentActor() actor: Actor): Promise<LeadNewCountDto> {
    return this.leads.countNew(actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Murojaat' })
  @ApiParam({ name: 'id', description: 'Murojaat ID' })
  @ApiDataResponse(LeadAdminDto, { description: 'Murojaat' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  findOne(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<LeadAdminDto> {
    return this.leads.findOne(actor, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Holat / izohni o‘zgartirish',
    description:
      'Holat o‘zgarsa — `handledBy` (siz) va `handledAt` yoziladi. ' +
      'Izoh ichki, mehmonga ko‘rinmaydi.',
  })
  @ApiParam({ name: 'id', description: 'Murojaat ID' })
  @ApiDataResponse(LeadAdminDto, { description: 'Yangilandi' })
  @ApiBadRequestResponse({ description: 'Maydon xato', type: ApiErrorDto })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  update(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ): Promise<LeadAdminDto> {
    return this.leads.update(actor, id, dto);
  }
}
