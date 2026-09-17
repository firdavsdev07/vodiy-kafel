import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentActor } from '../../auth/decorators';
import { CustomerOnlyGuard, JwtAuthGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import type { Actor } from '../../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { CustomersService } from './customers.service';
import { CustomerProfileResponseDto } from './dto';

/**
 * Optom mijoz kabineti — o'z profili (B-065).
 *
 * ⚠ NEGA `GET /auth/me` EMAS: u xodim profilini qaytaradi va mijoz tokeni
 *   bilan 401 beradi. Ikkalasini bitta endpointga birlashtirish javob
 *   turini birlashma (union) qilardi — `openapi-typescript` uni noqulay
 *   generatsiya qiladi va frontendda har safar tur tekshiruvi kerak
 *   bo'lardi. Alohida yo'l — toza shartnoma.
 *
 * ⚠ `PasswordChangeRequiredGuard` ATAYLAB YO'Q. Vaqtinchalik parol bilan
 *   kirgan mijoz ham o'zining kim ekanini ko'ra olishi kerak — aks holda
 *   parol almashtirish ekranida "kim sifatida kirdim?" degan savolga
 *   javob bo'lmaydi. Bu endpoint hech narsani o'zgartirmaydi va maxfiy
 *   ma'lumot bermaydi, shuning uchun xavfsiz.
 */
@ApiTags(SwaggerTag.Customers)
@Controller('me/profile')
@UseGuards(JwtAuthGuard, CustomerOnlyGuard)
@ApiBearerAuth(BEARER_AUTH)
@ApiUnauthorizedResponse({
  description: 'Token yo‘q, muddati o‘tgan yoki hisob faol emas',
  type: ApiErrorDto,
})
@ApiForbiddenResponse({
  description: 'Optom mijoz tokeni emas (xodim tokeni bilan kelindi)',
  type: ApiErrorDto,
})
export class MeProfileController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({
    summary: 'Mening profilim',
    description:
      'Kabinet sarlavhasi uchun: kompaniya nomi, mas’ul shaxs, login va ' +
      'BIRIKTIRILGAN FILIAL.\n\n' +
      'Filial muhim — mijoz aynan o‘sha filialning narxini ko‘radi ' +
      '(CLAUDE.md qoida 5), shuning uchun u qaysi filial ekanini bilishi ' +
      'kerak.\n\n' +
      '🔒 Narx qoidalari, chegirma sabablari va balans bu yerda YO‘Q.',
  })
  @ApiDataResponse(CustomerProfileResponseDto, { description: 'Profil' })
  getMine(@CurrentActor() actor: Actor): Promise<CustomerProfileResponseDto> {
    return this.customers.getMyProfile(actor);
  }
}
