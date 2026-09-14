import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { UserRole } from '../../common/enums';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import {
  CreateSizeDto,
  SizeAdminResponseDto,
  SizePublicResponseDto,
  UpdateSizeDto,
} from './dto';
import { SizesService } from './sizes.service';

/**
 * O'lchamlarni boshqarish (B-019).
 *
 * 🔒 Rol taqsimoti [[factories.admin.controller]] bilan bir xil: o'qish —
 *    barcha xodimlar, yozish — faqat SUPER_ADMIN. O'lcham ham GLOBAL
 *    katalog yozuvi, filialga bog'lanmagan.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/sizes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class SizesAdminController {
  constructor(private readonly sizesService: SizesService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MODERATOR,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({
    summary: 'O‘lchamlar ro‘yxati (boshqaruv uchun)',
    description:
      'Ochiq ro‘yxatdan farqi: tartib raqami va har o‘lchamdagi ' +
      'mahsulotlar soni ko‘rinadi.',
  })
  @ApiDataResponse(SizeAdminResponseDto, {
    isArray: true,
    description: 'O‘lchamlar',
  })
  findAll(): Promise<SizeAdminResponseDto[]> {
    return this.sizesService.findAllAdmin();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Yangi o‘lcham qo‘shish',
    description:
      'Ko‘rinadigan yozuv (`label`) eni va bo‘yidan AVTOMATIK yasaladi: ' +
      '`60` × `60` → `"60x60"`.\n\n' +
      'Uni qo‘lda yuborib bo‘lmaydi — aks holda yozuv bilan haqiqiy ' +
      'o‘lcham bir-biriga mos kelmay qolishi va katalog filtri jimgina ' +
      'noto‘g‘ri ishlashi mumkin edi.',
  })
  @ApiDataResponse(SizeAdminResponseDto, {
    status: 201,
    description: 'O‘lcham yaratildi',
  })
  @ApiBadRequestResponse({
    description: 'Eni yoki bo‘yi noto‘g‘ri (butun son, 1–1000 sm)',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Bunday o‘lcham allaqachon mavjud',
    type: ApiErrorDto,
  })
  create(@Body() dto: CreateSizeDto): Promise<SizeAdminResponseDto> {
    return this.sizesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'O‘lchamni tahrirlash',
    description:
      '⚠ Eni yoki bo‘yi o‘zgarsa `label` QAYTA HISOBLANADI — o‘lcham ' +
      'yozuvi haqiqiy qiymatga mos bo‘lib qolishi uchun.\n\n' +
      'Faqat bir tomoni yuborilsa, ikkinchisi eskisicha qoladi.',
  })
  @ApiParam({ name: 'id', description: 'O‘lcham ID' })
  @ApiDataResponse(SizeAdminResponseDto, { description: 'Yangilangan o‘lcham' })
  @ApiNotFoundResponse({ description: 'O‘lcham topilmadi', type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'Yangi o‘lcham allaqachon mavjud',
    type: ApiErrorDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSizeDto,
  ): Promise<SizeAdminResponseDto> {
    return this.sizesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'O‘lchamni o‘chirish',
    description:
      '⚠ Bu HAQIQIY o‘chirish (zavodlardagi kabi soft delete EMAS): ' +
      '`ProductSize` da `isActive` ustuni yo‘q, ya’ni «o‘chirilgan lekin ' +
      'saqlangan» holat sxemada nazarda tutilmagan.\n\n' +
      '🔒 Shu o‘lchamda mahsulot bo‘lsa — 409, va javobda nechtasi ' +
      'to‘sib turgani aytiladi.\n\n' +
      'Javobda o‘chirilgan yozuv qaytadi.',
  })
  @ApiParam({ name: 'id', description: 'O‘lcham ID' })
  @ApiDataResponse(SizePublicResponseDto, {
    description: 'O‘chirilgan o‘lcham',
  })
  @ApiNotFoundResponse({ description: 'O‘lcham topilmadi', type: ApiErrorDto })
  @ApiConflictResponse({
    description: 'O‘lchamda mahsulotlar bor — o‘chirib bo‘lmaydi',
    type: ApiErrorDto,
  })
  remove(@Param('id') id: string): Promise<SizePublicResponseDto> {
    return this.sizesService.remove(id);
  }
}
