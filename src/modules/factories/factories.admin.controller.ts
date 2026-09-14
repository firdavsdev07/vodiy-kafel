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
  CreateFactoryDto,
  FactoryAdminResponseDto,
  UpdateFactoryDto,
} from './dto';
import { FactoriesService } from './factories.service';

/**
 * Zavodlarni boshqarish (B-018).
 *
 * 🔒 ROL TAQSIMOTI — task'da ko'rsatilmagani uchun shu qaror qabul qilindi:
 *
 *   O'QISH  — barcha xodimlar. Menejer buyurtma kiritayotganda zavodlar
 *             ro'yxatini ko'rishi kerak.
 *   YOZISH  — faqat SUPER_ADMIN. Zavod GLOBAL katalog yozuvi: u filialga
 *             bog'lanmagan va barcha filiallarga ta'sir qiladi. Farg'ona
 *             admini yaratgan zavod Andijonda ham paydo bo'lardi — bu
 *             filial izolyatsiyasi ruhiga zid (CLAUDE.md qoida 5).
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/factories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({
  description: 'Bu amal uchun rol yetarli emas',
  type: ApiErrorDto,
})
export class FactoriesAdminController {
  constructor(private readonly factoriesService: FactoriesService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.MODERATOR,
    UserRole.BRANCH_ADMIN,
    UserRole.MANAGER,
  )
  @ApiOperation({
    summary: 'Barcha zavodlar (o‘chirilganlari bilan)',
    description:
      'Ochiq vitrinadan farqi: `isActive: false` bo‘lganlar ham ko‘rinadi, ' +
      'va har bir zavodda unga bog‘langan mahsulotlar soni bor.',
  })
  @ApiDataResponse(FactoryAdminResponseDto, {
    isArray: true,
    description: 'Zavodlar ro‘yxati',
  })
  findAll(): Promise<FactoryAdminResponseDto[]> {
    return this.factoriesService.findAllAdmin();
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Yangi zavod qo‘shish',
    description:
      'URL uchun `slug` nomdan AVTOMATIK yasaladi va keyin o‘zgarmaydi.\n\n' +
      'Bir xil slug beradigan nom allaqachon bo‘lsa — 409.',
  })
  @ApiDataResponse(FactoryAdminResponseDto, {
    status: 201,
    description: 'Zavod yaratildi',
  })
  @ApiBadRequestResponse({
    description: 'Maydonlar noto‘g‘ri',
    type: ApiErrorDto,
  })
  @ApiConflictResponse({
    description: 'Bunday nomli zavod bor yoki nomdan URL yasab bo‘lmadi',
    type: ApiErrorDto,
  })
  create(@Body() dto: CreateFactoryDto): Promise<FactoryAdminResponseDto> {
    return this.factoriesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Zavodni tahrirlash',
    description:
      'Faqat yuborilgan maydonlar o‘zgaradi.\n\n' +
      '⚠ `name` o‘zgarsa ham `slug` ESKICHA qoladi — katalog manzillari ' +
      'va tashqi havolalar buzilmasligi uchun.\n\n' +
      'O‘chirilgan zavodni qaytarish: `{ "isActive": true }`.',
  })
  @ApiParam({ name: 'id', description: 'Zavod ID' })
  @ApiDataResponse(FactoryAdminResponseDto, {
    description: 'Yangilangan zavod',
  })
  @ApiNotFoundResponse({ description: 'Zavod topilmadi', type: ApiErrorDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFactoryDto,
  ): Promise<FactoryAdminResponseDto> {
    return this.factoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Zavodni o‘chirish (soft delete)',
    description:
      '⚠ Yozuv BAZADAN O‘CHIRILMAYDI — faqat `isActive: false` bo‘ladi va ' +
      'ochiq vitrinadan yo‘qoladi. Sabab: zavodga mahsulotlar va narx ' +
      'qoidalari bog‘langan, ularni yo‘qotish eski buyurtmalar tarixini ' +
      'buzardi.\n\n' +
      'Javobda `productCount` — o‘chirish nechta mahsulotga ta’sir qilgani.\n\n' +
      'Qaytarish: `PATCH { "isActive": true }`.',
  })
  @ApiParam({ name: 'id', description: 'Zavod ID' })
  @ApiDataResponse(FactoryAdminResponseDto, {
    description: 'O‘chirilgan zavod (isActive: false)',
  })
  @ApiNotFoundResponse({ description: 'Zavod topilmadi', type: ApiErrorDto })
  remove(@Param('id') id: string): Promise<FactoryAdminResponseDto> {
    return this.factoriesService.softDelete(id);
  }
}
