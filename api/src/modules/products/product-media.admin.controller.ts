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
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import {
  ProductMediaAdminResponseDto,
  ReorderProductMediaDto,
  UploadProductMediaBodyDto,
  UploadProductMediaDto,
} from './dto';
import { MAX_UPLOAD_BYTES, type UploadedFileData } from '../../storage';
import { ProductMediaService } from './product-media.service';

/**
 * Mahsulot media — 360° ko'rinish (B-022, TZ 3.1).
 *
 * 🔒 Yozish faqat SUPER_ADMIN — media umumiy katalog qismi (B-021 bilan
 *    bir xil qoida).
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class ProductMediaAdminController {
  constructor(private readonly media: ProductMediaService) {}

  @Get('products/:id/media')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MODERATOR,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({
    summary: 'Mahsulot media ro‘yxati',
    description:
      'Tartiblangan. O‘chirilgan mahsulot uchun ham ishlaydi (ochiq ' +
      '`GET /products/:slug` dan farqli).',
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID' })
  @ApiDataResponse(ProductMediaAdminResponseDto, {
    isArray: true,
    description: 'Media fayllar',
  })
  @ApiNotFoundResponse({ description: 'Mahsulot topilmadi', type: ApiErrorDto })
  findAll(@Param('id') id: string): Promise<ProductMediaAdminResponseDto[]> {
    return this.media.findAll(id);
  }

  @Post('products/:id/media')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadProductMediaBodyDto })
  @ApiOperation({
    summary: 'Media yuklash',
    description:
      '`multipart/form-data`: `file` + ixtiyoriy `type`.\n\n' +
      '• `IMAGE`, `IMAGE_360` — JPG, PNG, WEBP\n' +
      '• `VIDEO_360` — MP4\n\n' +
      'Maksimal hajm — 10 MB. Tur fayl MAZMUNIDAN aniqlanadi: kengaytmani ' +
      'o‘zgartirish (`rasm.svg` → `rasm.jpg`) yordam bermaydi.\n\n' +
      'Yangi fayl ro‘yxat oxiriga qo‘shiladi.',
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID' })
  @ApiDataResponse(ProductMediaAdminResponseDto, {
    status: 201,
    description: 'Yuklandi',
  })
  @ApiBadRequestResponse({
    description: 'Fayl yo‘q yoki turi mos emas',
    type: ApiErrorDto,
  })
  @ApiPayloadTooLargeResponse({
    description: 'Fayl 10 MB dan katta',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'Mahsulot topilmadi', type: ApiErrorDto })
  upload(
    @Param('id') id: string,
    @UploadedFile() file: UploadedFileData | undefined,
    @Body() dto: UploadProductMediaDto,
  ): Promise<ProductMediaAdminResponseDto> {
    return this.media.upload(id, file, dto.type);
  }

  @Patch('products/:id/media/order')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Media tartibini o‘zgartirish',
    description:
      '`mediaIds` — mahsulotning BARCHA media ID lari yangi tartibda. ' +
      'Qisman ro‘yxat yoki begona ID — 400.',
  })
  @ApiParam({ name: 'id', description: 'Mahsulot ID' })
  @ApiDataResponse(ProductMediaAdminResponseDto, {
    isArray: true,
    description: 'Yangi tartibdagi media',
  })
  @ApiBadRequestResponse({
    description: 'Ro‘yxat to‘liq emas yoki begona ID bor',
    type: ApiErrorDto,
  })
  @ApiNotFoundResponse({ description: 'Mahsulot topilmadi', type: ApiErrorDto })
  reorder(
    @Param('id') id: string,
    @Body() dto: ReorderProductMediaDto,
  ): Promise<ProductMediaAdminResponseDto[]> {
    return this.media.reorder(id, dto.mediaIds);
  }

  @Delete('media/:id')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Media o‘chirish',
    description: 'Bazadagi yozuv va diskdagi fayl o‘chiriladi.',
  })
  @ApiParam({ name: 'id', description: 'Media ID' })
  @ApiDataResponse(ProductMediaAdminResponseDto, {
    description: 'O‘chirilgan media',
  })
  @ApiNotFoundResponse({ description: 'Media topilmadi', type: ApiErrorDto })
  remove(@Param('id') id: string): Promise<ProductMediaAdminResponseDto> {
    return this.media.remove(id);
  }
}
