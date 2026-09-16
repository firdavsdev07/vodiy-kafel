import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
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
import { ContractsService } from './contracts.service';
import {
  ContractQueryDto,
  ContractResponseDto,
  CreateContractDto,
} from './dto';

const PaginatedContracts = PaginatedResponseDto(ContractResponseDto);

/**
 * Shartnoma moduli — optom mijoz (B-045, TZ 3.10). 🧪 Hozircha mock:
 * kompaniya ma'lumoti Didox.uz o'rniga soxta, Telegram orqali yuborish —
 * faqat log. Haqiqiy integratsiya (B-044 spike'dan keyin) faqat provayder
 * darajasida almashadi — bu endpointlar o'zgarmaydi.
 *
 * ⚠ Chakana mijozda hisob yo'q — faqat B2B tokeni (CLAUDE.md qoida 4).
 */
@ApiTags(SwaggerTag.Contracts)
@Controller('wholesale/contracts')
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
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Post()
  @ApiOperation({
    summary: 'Shartnoma yaratish (INN bo‘yicha)',
    description:
      'INN bo‘yicha kompaniya ma’lumoti so‘raladi (🧪 mock), PDF ' +
      'generatsiya qilinadi va Telegram orqali "yuboriladi" (🧪 mock).\n\n' +
      'Natija darhol `SENT` holatida qaytadi — mock oqimda kutish yo‘q.',
  })
  @ApiDataResponse(ContractResponseDto, {
    status: 201,
    description: 'Shartnoma yaratildi va yuborildi',
  })
  @ApiNotFoundResponse({
    description: '`orderId` berilgan bo‘lsa — topilmadi yoki begonaniki',
    type: ApiErrorDto,
  })
  create(
    @CurrentActor() actor: Actor,
    @Body() dto: CreateContractDto,
  ): Promise<ContractResponseDto> {
    return this.contracts.create(actor, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Mening shartnomalarim' })
  @ApiDataResponse(PaginatedContracts, { description: 'Sahifalangan' })
  findMine(
    @CurrentActor() actor: Actor,
    @Query() query: ContractQueryDto,
  ): Promise<PaginatedResult<ContractResponseDto>> {
    return this.contracts.findMine(actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Shartnoma tafsiloti' })
  @ApiParam({ name: 'id', description: 'Shartnoma ID' })
  @ApiDataResponse(ContractResponseDto, { description: 'Shartnoma' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  findMineOne(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<ContractResponseDto> {
    return this.contracts.findMineOne(actor, id);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Shartnoma PDF faylini yuklab olish',
    description:
      '⚠ Ochiq `/uploads/...` orqali EMAS — faqat shu autentifikatsiya ' +
      'qilingan yo‘l bilan, faqat o‘z shartnomangiz uchun.',
  })
  @ApiParam({ name: 'id', description: 'Shartnoma ID' })
  @ApiOkResponse({ description: 'PDF fayl (application/pdf)' })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa mijoznikiki',
    type: ApiErrorDto,
  })
  async download(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.contracts.download(actor, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
