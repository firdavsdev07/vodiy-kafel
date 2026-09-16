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
import { CurrentActor, Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { MAX_UPLOAD_BYTES, type UploadedFileData } from '../../storage';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { BranchesService } from './branches.service';
import {
  BranchAdminDto,
  BranchAdminQueryDto,
  CreateBranchDto,
  UpdateBranchDto,
  UploadBranchImageBodyDto,
} from './dto/branch.dto';

/** O'z filiali bilan ishlaydigan rahbarlar (kontakt va surat). */
const BRANCH_EDITORS = [
  UserRole.SUPER_ADMIN,
  UserRole.BRANCH_ADMIN,
  UserRole.MODERATOR,
];

/**
 * Filiallar boshqaruvi (B-041).
 *
 * 🔒 Yaratish va yopish — SUPER_ADMIN. Filial admini / moderator — faqat
 *    O'Z filiali: kontakt maydonlari va bino surati. Boshqasi — 404.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/branches')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class BranchesAdminController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
    UserRole.MODERATOR,
  )
  @ApiOperation({
    summary: 'Filiallar (RETAIL + CENTRAL, yopilganlari bilan)',
    description: '🔒 Filial xodimi faqat o‘z filialini ko‘radi.',
  })
  @ApiDataResponse(BranchAdminDto, { isArray: true, description: 'Filiallar' })
  findAll(
    @CurrentActor() actor: Actor,
    @Query() query: BranchAdminQueryDto,
  ): Promise<BranchAdminDto[]> {
    return this.branches.findAllAdmin(actor, query);
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
    UserRole.MODERATOR,
  )
  @ApiOperation({ summary: 'Filial' })
  @ApiParam({ name: 'id', description: 'Filial ID' })
  @ApiDataResponse(BranchAdminDto, { description: 'Filial' })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filial',
    type: ApiErrorDto,
  })
  findOne(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
  ): Promise<BranchAdminDto> {
    return this.branches.findOneAdmin(actor, id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Filial qo‘shish',
    description:
      '`type` keyin o‘zgarmaydi. Yangi RETAIL filial narxlari ' +
      '(`/admin/branch-products`) va tariflari kiritilmaguncha mijozlar ' +
      'undan buyurtma bera olmaydi.',
  })
  @ApiDataResponse(BranchAdminDto, { status: 201, description: 'Qo‘shildi' })
  @ApiBadRequestResponse({
    description: 'Maydonlar noto‘g‘ri',
    type: ApiErrorDto,
  })
  create(@Body() dto: CreateBranchDto): Promise<BranchAdminDto> {
    return this.branches.create(dto);
  }

  @Patch(':id')
  @Roles(...BRANCH_EDITORS)
  @ApiOperation({
    summary: 'Filialni tahrirlash',
    description:
      'SUPER_ADMIN — hamma maydon (`type` dan tashqari).\n\n' +
      '🔒 Filial admini / moderator — faqat O‘Z filiali va faqat kontakt: ' +
      '`address`, `latitude`, `longitude`, `workingHours`, `phones`, ' +
      '`telegramUrl`, `instagramUrl`. Boshqa maydon — 403.',
  })
  @ApiParam({ name: 'id', description: 'Filial ID' })
  @ApiDataResponse(BranchAdminDto, { description: 'Yangilandi' })
  @ApiBadRequestResponse({
    description: 'Maydonlar noto‘g‘ri',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filial',
    type: ApiErrorDto,
  })
  update(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ): Promise<BranchAdminDto> {
    return this.branches.update(actor, id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Filialni yopish (soft delete)',
    description:
      'Saytda ko‘rinmaydi, mijozlari buyurtma bera olmaydi. Tarix saqlanadi. ' +
      'Qayta ochish — `PATCH { "isActive": true }`.',
  })
  @ApiParam({ name: 'id', description: 'Filial ID' })
  @ApiDataResponse(BranchAdminDto, { description: 'Yopildi' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  remove(@Param('id') id: string): Promise<BranchAdminDto> {
    return this.branches.deactivate(id);
  }

  @Post(':id/image')
  @HttpCode(200)
  @Roles(...BRANCH_EDITORS)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadBranchImageBodyDto })
  @ApiOperation({
    summary: 'Bino surati yuklash',
    description:
      '`multipart/form-data`: `file` (JPG/PNG/WEBP, 10 MB gacha). Eski ' +
      'surat almashtiriladi. Tur fayl MAZMUNIDAN aniqlanadi.',
  })
  @ApiParam({ name: 'id', description: 'Filial ID' })
  @ApiDataResponse(BranchAdminDto, { description: 'Yuklandi' })
  @ApiBadRequestResponse({
    description: 'Fayl yo‘q yoki turi mos emas',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Topilmadi yoki boshqa filial',
    type: ApiErrorDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'Fayl 10 MB dan katta',
    type: ApiErrorDto,
  })
  uploadImage(
    @CurrentActor() actor: Actor,
    @Param('id') id: string,
    @UploadedFile() file: UploadedFileData | undefined,
  ): Promise<BranchAdminDto> {
    return this.branches.uploadImage(actor, id, file);
  }
}
