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
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { UserRole } from '../../common/enums';
import { MAX_UPLOAD_BYTES, type UploadedFileData } from '../../storage';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import {
  CreateGalleryItemBodyDto,
  CreateGalleryItemDto,
  GalleryAdminItemDto,
  GalleryAdminQueryDto,
  UpdateGalleryItemDto,
} from './dto';
import { GalleryService } from './gallery.service';

const PaginatedAdminGallery = PaginatedResponseDto(GalleryAdminItemDto);

/**
 * Galereya boshqaruvi (B-024).
 *
 * 🔒 Yozish faqat SUPER_ADMIN — galereya bosh sahifada, barcha filiallar
 *    uchun umumiy.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/gallery')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class GalleryAdminController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MODERATOR,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({
    summary: 'Galereya (yashirilganlari bilan)',
    description: 'Mahsulot yoki holat bo‘yicha filtr.',
  })
  @ApiDataResponse(PaginatedAdminGallery, { description: 'Sahifalangan' })
  findAll(
    @Query() query: GalleryAdminQueryDto,
  ): Promise<PaginatedResult<GalleryAdminItemDto>> {
    return this.gallery.findAdmin(query);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateGalleryItemBodyDto })
  @ApiOperation({
    summary: 'Galereyaga rasm qo‘shish',
    description:
      '`multipart/form-data`: `file` (JPG/PNG/WEBP, 10 MB gacha) + ixtiyoriy ' +
      '`title`, `productId`, `sortOrder`.\n\n' +
      'Tur fayl MAZMUNIDAN aniqlanadi.',
  })
  @ApiDataResponse(GalleryAdminItemDto, {
    status: 201,
    description: 'Qo‘shildi',
  })
  @ApiBadRequestResponse({
    description: 'Fayl yo‘q, turi mos emas yoki mahsulot topilmadi',
    type: ApiErrorDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'Fayl 10 MB dan katta',
    type: ApiErrorDto,
  })
  create(
    @UploadedFile() file: UploadedFileData | undefined,
    @Body() dto: CreateGalleryItemDto,
  ): Promise<GalleryAdminItemDto> {
    return this.gallery.create(file, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Galereya rasmini tahrirlash',
    description:
      'Sarlavha, mahsulot bog‘lanishi (`null` — uzish), tartib, holat. ' +
      'Rasmning o‘zi almashtirilmaydi — yangi rasm uchun yangi yozuv.',
  })
  @ApiParam({ name: 'id', description: 'Galereya rasmi ID' })
  @ApiDataResponse(GalleryAdminItemDto, { description: 'Yangilandi' })
  @ApiBadRequestResponse({
    description: 'Maydonlar noto‘g‘ri yoki mahsulot topilmadi',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGalleryItemDto,
  ): Promise<GalleryAdminItemDto> {
    return this.gallery.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Galereya rasmini o‘chirish',
    description:
      'Yozuv va fayl butunlay o‘chiriladi. Vaqtincha yashirish uchun — ' +
      '`PATCH { "isActive": false }`.',
  })
  @ApiParam({ name: 'id', description: 'Galereya rasmi ID' })
  @ApiDataResponse(GalleryAdminItemDto, { description: 'O‘chirildi' })
  @ApiNotFoundResponse({ description: 'Topilmadi', type: ApiErrorDto })
  remove(@Param('id') id: string): Promise<GalleryAdminItemDto> {
    return this.gallery.remove(id);
  }
}
