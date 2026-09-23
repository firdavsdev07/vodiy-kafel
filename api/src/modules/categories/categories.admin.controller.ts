import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
  CategoryAdminResponseDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  UploadCategoryImageBodyDto,
} from './dto';
import { CategoriesService } from './categories.service';

const UPLOAD = FileInterceptor('file', {
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

/**
 * Kategoriyalarni boshqarish (B-067).
 *
 * 🔒 ROL TAQSIMOTI — [[factories.admin.controller]] bilan bir xil qaror:
 *
 *   O'QISH  — barcha xodimlar. Menejer mahsulot kiritayotganda kategoriya
 *             ro'yxatini ko'rishi kerak.
 *   YOZISH  — faqat SUPER_ADMIN. Kategoriya GLOBAL katalog yozuvi: u
 *             filialga bog'lanmagan va barcha filiallarga ta'sir qiladi.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class CategoriesAdminController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MODERATOR,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({
    summary: 'Barcha kategoriyalar (o‘chirilganlari bilan)',
    description:
      'Ochiq vitrinadan farqi: `isActive: false` bo‘lganlar ham ko‘rinadi, ' +
      'va har bir kategoriyada unga bog‘langan mahsulotlar soni bor.',
  })
  @ApiDataResponse(CategoryAdminResponseDto, {
    isArray: true,
    description: 'Kategoriyalar ro‘yxati',
  })
  findAll(): Promise<CategoryAdminResponseDto[]> {
    return this.categories.findAllAdmin();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Yangi kategoriya qo‘shish',
    description:
      'URL uchun `slug` nomdan AVTOMATIK yasaladi va keyin o‘zgarmaydi.\n\n' +
      'Bir xil slug beradigan nom allaqachon bo‘lsa — 409.',
  })
  @ApiDataResponse(CategoryAdminResponseDto, {
    status: 201,
    description: 'Kategoriya yaratildi',
  })
  @ApiBadRequestResponse({
    description: 'Maydonlar noto‘g‘ri',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Bunday nomli kategoriya bor yoki nomdan URL yasab bo‘lmadi',
    type: ApiErrorDto,
  })
  create(@Body() dto: CreateCategoryDto): Promise<CategoryAdminResponseDto> {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Kategoriyani tahrirlash',
    description:
      'Faqat yuborilgan maydonlar o‘zgaradi.\n\n' +
      '⚠ `name` o‘zgarsa ham `slug` ESKICHA qoladi — katalog filtri ' +
      'havolalari buzilmasligi uchun.\n\n' +
      'O‘chirilgan kategoriyani qaytarish: `{ "isActive": true }`.',
  })
  @ApiParam({ name: 'id', description: 'Kategoriya ID' })
  @ApiDataResponse(CategoryAdminResponseDto, {
    description: 'Yangilangan kategoriya',
  })
  @ApiNotFoundResponse({
    description: 'Kategoriya topilmadi',
    type: ApiErrorDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryAdminResponseDto> {
    return this.categories.update(id, dto);
  }

  @Post(':id/image')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(UPLOAD)
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadCategoryImageBodyDto })
  @ApiOperation({
    summary: 'Muqova suratini yuklash',
    description:
      '`multipart/form-data`: `file` (JPG/PNG/WEBP, 10 MB gacha). Eski ' +
      'surat almashtiriladi. Tur fayl MAZMUNIDAN aniqlanadi.',
  })
  @ApiParam({ name: 'id', description: 'Kategoriya ID' })
  @ApiDataResponse(CategoryAdminResponseDto, { description: 'Yuklandi' })
  @ApiBadRequestResponse({
    description: 'Fayl yo‘q yoki turi mos emas',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Kategoriya topilmadi',
    type: ApiErrorDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'Fayl 10 MB dan katta',
    type: ApiErrorDto,
  })
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: UploadedFileData | undefined,
  ): Promise<CategoryAdminResponseDto> {
    return this.categories.uploadImage(id, file);
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Kategoriyani o‘chirish (soft delete)',
    description:
      '⚠ Yozuv BAZADAN O‘CHIRILMAYDI — faqat `isActive: false` bo‘ladi va ' +
      'ochiq vitrinadan yo‘qoladi. Bog‘langan mahsulotlar kategoriyasiz ' +
      '(`categoryId: null`) qolmaydi — ular o‘zgarishsiz qoladi, faqat ' +
      'kategoriyaning o‘zi vitrinadan yashiriladi.\n\n' +
      'Javobda `productCount` — o‘chirish nechta mahsulotga ta’sir qilgani.\n\n' +
      'Qaytarish: `PATCH { "isActive": true }`.',
  })
  @ApiParam({ name: 'id', description: 'Kategoriya ID' })
  @ApiDataResponse(CategoryAdminResponseDto, {
    description: 'O‘chirilgan kategoriya (isActive: false)',
  })
  @ApiNotFoundResponse({
    description: 'Kategoriya topilmadi',
    type: ApiErrorDto,
  })
  remove(@Param('id') id: string): Promise<CategoryAdminResponseDto> {
    return this.categories.softDelete(id);
  }
}
