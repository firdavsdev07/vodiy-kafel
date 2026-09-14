import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../common';
import { ApiErrorDto } from '../common/dto/api-error.dto';
import type { Actor } from '../common/types/actor';
import { BEARER_AUTH, SwaggerTag } from '../swagger/tags';
import { AuthService } from './auth.service';
import { CurrentActor } from './decorators/current-actor.decorator';
import {
  AdminLoginDto,
  AuthTokensResponseDto,
  ChangePasswordDto,
  LogoutResponseDto,
  RefreshTokenDto,
  UserProfileResponseDto,
  WholesaleLoginDto,
  WholesaleTokensResponseDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags(SwaggerTag.Auth)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('admin/login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Xodim kirishi (admin, moderator, filial admini, menejer)',
    description:
      'Telefon va parol bilan kirish. Muvaffaqiyatli javobda access va ' +
      'refresh tokenlar keladi.\n\n' +
      'Rol va filial tokenning ichida bo‘ladi — ularni so‘rovda yuborish ' +
      'kerak emas va yuborilsa ham e’tiborga olinmaydi.',
  })
  @ApiDataResponse(AuthTokensResponseDto, {
    description: 'Kirish muvaffaqiyatli',
  })
  @ApiUnauthorizedResponse({
    description:
      'Telefon raqam topilmadi, parol xato yoki hisob faol emas — ' +
      'uch holat uchun bir xil javob (raqam bazada bor-yo‘qligi oshkor qilinmaydi).',
    type: ApiErrorDto,
  })
  adminLogin(@Body() dto: AdminLoginDto): Promise<AuthTokensResponseDto> {
    return this.authService.adminLogin(dto);
  }

  @Post('wholesale/login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Optom (B2B) mijoz kirishi',
    description:
      'Login va parol bilan kirish. Ikkovini ham ADMIN yoki MENEJER ' +
      'beradi — mijoz o‘zi ro‘yxatdan o‘tolmaydi.\n\n' +
      'Login katta-kichik harfga sezgir emas.\n\n' +
      '⚠ Javobdagi `mustChangePassword: true` — bu vaqtinchalik parol. ' +
      'Mijoz `/auth/wholesale/change-password` dan boshqa hech qayerga ' +
      'o‘tolmaydi (403), shuning uchun frontend darhol parol almashtirish ' +
      'oynasini ko‘rsatishi kerak.',
  })
  @ApiDataResponse(WholesaleTokensResponseDto, {
    description: 'Kirish muvaffaqiyatli',
  })
  @ApiUnauthorizedResponse({
    description:
      'Login topilmadi, parol xato yoki hisob faol emas — ' +
      'uch holat uchun bir xil javob.',
    type: ApiErrorDto,
  })
  wholesaleLogin(
    @Body() dto: WholesaleLoginDto,
  ): Promise<WholesaleTokensResponseDto> {
    return this.authService.wholesaleLogin(dto);
  }

  @Post('wholesale/change-password')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(BEARER_AUTH)
  @ApiOperation({
    summary: 'Optom mijoz parolini almashtirish',
    description:
      'Birinchi kirishda MAJBURIY, keyin ixtiyoriy.\n\n' +
      'Joriy parol ham so‘raladi — o‘g‘irlangan token bilan hisobni ' +
      'butunlay egallab olishning oldini oladi.\n\n' +
      '⚠ Javobda YANGI token juftligi keladi: eskisida ' +
      '`mustChangePassword: true` qolgan va u bilan mijoz hamon to‘silgan ' +
      'bo‘lardi. Frontend eski tokenlarni almashtirishi shart.',
  })
  @ApiDataResponse(WholesaleTokensResponseDto, {
    description: 'Parol almashtirildi, yangi tokenlar berildi',
  })
  @ApiBadRequestResponse({
    description:
      'Yangi parol qoidaga mos emas yoki joriy paroldan farq qilmaydi',
    type: ApiErrorDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Token yaroqsiz, joriy parol xato yoki hisob faol emas',
    type: ApiErrorDto,
  })
  changeWholesalePassword(
    @CurrentActor() actor: Actor,
    @Body() dto: ChangePasswordDto,
  ): Promise<WholesaleTokensResponseDto> {
    return this.authService.changeWholesalePassword(actor, dto);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Tokenlarni yangilash',
    description:
      'Refresh token o‘rniga yangi access + refresh juftligi beriladi.\n\n' +
      '⚠ Bu yerga faqat `refreshToken` yuboriladi — access token ' +
      'boshqa kalit bilan imzolangani uchun qabul qilinmaydi.\n\n' +
      'Xodim va optom mijoz tokenlari — ikkovi ham shu endpoint orqali ' +
      'yangilanadi (tur tokenning ichida).\n\n' +
      'Rol, filial va parol holati bazadan qayta o‘qiladi: xodim boshqa ' +
      'filialga o‘tkazilgan bo‘lsa yangi token yangi filialni oladi, admin ' +
      'mijoz parolini qayta tiklagan bo‘lsa yangi token to‘silgan holatda ' +
      'chiqadi.\n\n' +
      '⚠ Javobda faqat token juftligi bo‘ladi. Optom mijozning ' +
      '`mustChangePassword` holati tokenning ichida keladi va uni ' +
      '`PasswordChangeRequiredGuard` qo‘llaydi.',
  })
  @ApiDataResponse(AuthTokensResponseDto, {
    description: 'Yangi token juftligi',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token yaroqsiz, muddati tugagan yoki hisob faol emas',
    type: ApiErrorDto,
  })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensResponseDto> {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(BEARER_AUTH)
  @ApiOperation({
    summary: 'Tizimdan chiqish',
    description:
      '⚠ MUHIM: tokenlar stateless (server tomonda saqlanmaydi), shuning ' +
      'uchun bu endpoint tokenni BEKOR QILMAYDI — berilgan access token ' +
      'muddati tugaguncha (15 daqiqa) ishlashda davom etadi.\n\n' +
      'Chiqish frontend zimmasida: `accessToken` va `refreshToken` ' +
      'saqlangan joydan O‘CHIRILISHI shart. Bu endpoint faqat tasdiq ' +
      'qaytaradi (va kelajakda audit yozuvi uchun joy bo‘lib qoladi).',
  })
  @ApiDataResponse(LogoutResponseDto, { description: 'Chiqish qabul qilindi' })
  @ApiUnauthorizedResponse({
    description: 'Token yo‘q yoki yaroqsiz',
    type: ApiErrorDto,
  })
  logout(): LogoutResponseDto {
    return { message: 'Tizimdan chiqdingiz — tokenlarni o‘chiring' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth(BEARER_AUTH)
  @ApiOperation({
    summary: 'Joriy foydalanuvchi profili',
    description:
      'Tokendagi `sub` bo‘yicha bazadan o‘qiladi — profil har doim ' +
      'joriy holatni ko‘rsatadi (token eski bo‘lsa ham).\n\n' +
      '🔒 Parol hashi javobda hech qachon bo‘lmaydi.\n\n' +
      '⚠ Faqat XODIM tokeni uchun. Optom mijoz tokeni bilan kelinsa 401 ' +
      'qaytadi — mijoz profili kabinet endpointlarida (B-018+).',
  })
  @ApiDataResponse(UserProfileResponseDto, {
    description: 'Joriy xodim profili',
  })
  @ApiUnauthorizedResponse({
    description: 'Token yo‘q, yaroqsiz yoki hisob faol emas',
    type: ApiErrorDto,
  })
  me(@CurrentActor() actor: Actor): Promise<UserProfileResponseDto> {
    return this.authService.getProfile(actor);
  }
}
