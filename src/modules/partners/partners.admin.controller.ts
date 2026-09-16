import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
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
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { UserRole } from '../../common/enums';
import { MAX_UPLOAD_BYTES, type UploadedFileData } from '../../storage';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import {
  CreatePartnerBodyDto,
  CreatePartnerDto,
  PartnerAdminDto,
  PartnerAdminQueryDto,
  UpdatePartnerDto,
  UploadPartnerLogoBodyDto,
} from './dto/partner.dto';
import { PartnersService } from './partners.service';

const UPLOAD = FileInterceptor('file', {
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

/**
 * Hamkorlar boshqaruvi (B-042). Yozish — SUPER_ADMIN, o'qish — barcha xodim.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/partners')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class PartnersAdminController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
    UserRole.MODERATOR,
  )
  @ApiOperation({ summary: 'Hamkorlar (yashirilganlari bilan)' })
  @ApiDataResponse(PartnerAdminDto, { isArray: true, description: 'Ro‘yxat' })
  findAll(@Query() query: PartnerAdminQueryDto): Promise<PartnerAdminDto[]> {
    return this.partners.findAdmin(query);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreatePartnerBodyDto })
  @ApiOperation({
    summary: 'Hamkor qo‘shish',
    description:
      '`multipart/form-data`: `file` (logotip, JPG/PNG/WEBP, 10 MB gacha) + ' +
      '`name`, ixtiyoriy `websiteUrl`, `sortOrder`.',
  })
  @ApiDataResponse(PartnerAdminDto, { status: 201, description: 'Qo‘shildi' })
  @ApiBadRequestResponse({
    description: 'Logotip yo‘q / turi mos emas yoki maydon xato',
    type: ApiErrorDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'Fayl 10 MB dan katta',
    type: ApiErrorDto,
  })
  create(
    @UploadedFile() file: UploadedFileData | undefined,
    @Body() dto: CreatePartnerDto,
  ): Promise<PartnerAdminDto> {
    return this.partners.create(file, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Hamkorni tahrirlash',
    description: 'Logotip bu yerda emas — `POST /admin/partners/{id}/logo`.',
  })
  @ApiParam({ name: 'id', description: 'Hamkor ID' })
  @ApiDataResponse(PartnerAdminDto, { description: 'Yangilandi' })
  @ApiBadRequestResponse({ description: 'Maydon xato', type: ApiErrorDto })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
  ): Promise<PartnerAdminDto> {
    return this.partners.update(id, dto);
  }

  @Post(':id/logo')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadPartnerLogoBodyDto })
  @ApiOperation({ summary: 'Logotipni almashtirish' })
  @ApiParam({ name: 'id', description: 'Hamkor ID' })
  @ApiDataResponse(PartnerAdminDto, { description: 'Almashtirildi' })
  @ApiBadRequestResponse({
    description: 'Fayl yo‘q yoki turi mos emas',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  @ApiPayloadTooLargeResponse({
    description: 'Fayl 10 MB dan katta',
    type: ApiErrorDto,
  })
  replaceLogo(
    @Param('id') id: string,
    @UploadedFile() file: UploadedFileData | undefined,
  ): Promise<PartnerAdminDto> {
    return this.partners.replaceLogo(id, file);
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Hamkorni o‘chirish',
    description:
      'Yozuv va logotip butunlay o‘chiriladi. Vaqtincha yashirish — ' +
      '`PATCH { "isActive": false }`.',
  })
  @ApiParam({ name: 'id', description: 'Hamkor ID' })
  @ApiDataResponse(PartnerAdminDto, { description: 'O‘chirildi' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  remove(@Param('id') id: string): Promise<PartnerAdminDto> {
    return this.partners.remove(id);
  }
}
