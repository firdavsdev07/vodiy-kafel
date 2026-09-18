import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Actor } from '../common/types/actor';
import type { TokenPayload } from '../common/types/token-payload';
import { AppConfigService } from '../config';
import { PrismaService } from '../prisma';
import type {
  AdminLoginDto,
  AuthTokensResponseDto,
  ChangePasswordDto,
  LoginDto,
  LoginResponseDto,
  RefreshTokenDto,
  UserProfileResponseDto,
  WholesaleLoginDto,
  WholesaleTokensResponseDto,
} from './dto';

/** Token payload — imzolashdan oldin (iat/exp ni JwtService qo'yadi). */
type SignablePayload = Omit<TokenPayload, 'iat' | 'exp'>;

/**
 * Kirish xatosining YAGONA matni.
 *
 * 🔒 "Foydalanuvchi topilmadi", "parol xato" va "hisob o'chirilgan" —
 * uchtasi ham SHU matnni qaytaradi. Aks holda hujumchi javoblarni
 * solishtirib, bazada qaysi telefon raqam borligini aniqlab olaladi.
 */
const INVALID_CREDENTIALS = 'Telefon raqam yoki parol xato';

/** Optom mijoz uchun xuddi shu qoida — login bor-yo'qligi oshkor qilinmaydi. */
const INVALID_WHOLESALE_CREDENTIALS = 'Login yoki parol xato';

/**
 * Loginni normallashtiradi.
 *
 * ⚠ `Customer.login` bazada kichik harfda saqlanadi (sxema izohi, B-007) —
 * qidirishdan oldin ham xuddi shunday keltirilmasa, "Ali" bilan kirgan mijoz
 * "hisob yo'q" javobini olardi.
 */
const normalizeLogin = (login: string): string => login.trim().toLowerCase();

/**
 * Foydalanuvchi topilmaganda ham bcrypt.compare chaqirish uchun soxta hash.
 * Maqsad — javob vaqtini tenglashtirish: "tez rad javob" ham raqamning
 * bazada yo'qligini oshkor qiladi. Bu hashga hech qanday parol to'g'ri kelmaydi.
 */
const DUMMY_PASSWORD_HASH =
  '$2b$10$NbVdM9IKszo6SMM7OttriuOT1/.gq9n3gcqIYvdkJiRqYSBltuNyO';

/** `/auth/me` va `/auth/refresh` uchun tanlanadigan maydonlar. */
const USER_PROFILE_SELECT = {
  id: true,
  phone: true,
  email: true,
  fullName: true,
  role: true,
  branchId: true,
  telegramUsername: true,
  isActive: true,
} as const;

/**
 * Auth service — parol, token va kirish oqimi.
 *
 * 🔒 Qoida: parol yoki `passwordHash` hech qachon javobga chiqmaydi —
 *   faqat { accessToken, refreshToken } yoki profil maydonlari.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /** Parolni hash qiladi (bcrypt, rounds=10) */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /** Hash va parolni solishtiradi */
  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /** Access token — JWT_SECRET, JWT_EXPIRES (odatda 15 daqiqa). */
  generateAccessToken(payload: SignablePayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.jwt.secret,
      expiresIn: this.config.jwt.expiresIn,
    });
  }

  /**
   * Refresh token — JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES (odatda 30 kun).
   *
   * ⚠ Access token'dan BOSHQA kalit bilan imzolanadi. Shuning uchun
   *   o'g'irlangan access token bilan `/auth/refresh` dan yangi juftlik
   *   olib bo'lmaydi (va refresh token himoyalangan endpointga o'tmaydi).
   */
  generateRefreshToken(payload: SignablePayload): string {
    return this.jwtService.sign(payload, {
      secret: this.config.jwt.refreshSecret,
      expiresIn: this.config.jwt.refreshExpiresIn,
    });
  }

  /** Token juftligi. */
  generateTokens(payload: SignablePayload): AuthTokensResponseDto {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Xodim kirishi — telefon + parol.
   *
   * 🔒 Uch xato holati (raqam yo'q / hisob o'chirilgan / parol xato) bir xil
   *    401 qaytaradi va bcrypt har holatda ishlaydi.
   */
  async adminLogin(dto: AdminLoginDto): Promise<AuthTokensResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: {
        id: true,
        passwordHash: true,
        role: true,
        branchId: true,
        isActive: true,
      },
    });

    const passwordMatches = await this.validatePassword(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return this.generateTokens({
      sub: user.id,
      type: 'USER',
      role: user.role,
      branchId: user.branchId,
    });
  }

  /**
   * Optom (B2B) mijoz kirishi — admin bergan login + parol.
   *
   * 🔒 Xodim kirishidagi kabi: topilmadi / o'chirilgan / parol xato —
   *    uchtasi bir xil 401 va bcrypt har holatda ishlaydi.
   *
   * ⚠ Token'da `role` YO'Q — mijoz xodim emas (TokenPayload izohiga qara).
   */
  async wholesaleLogin(
    dto: WholesaleLoginDto,
  ): Promise<WholesaleTokensResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { login: normalizeLogin(dto.login) },
      select: {
        id: true,
        passwordHash: true,
        branchId: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    const passwordMatches = await this.validatePassword(
      dto.password,
      customer?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!customer || !customer.isActive || !passwordMatches) {
      throw new UnauthorizedException(INVALID_WHOLESALE_CREDENTIALS);
    }

    return {
      ...this.generateTokens({
        sub: customer.id,
        type: 'CUSTOMER',
        branchId: customer.branchId,
        mustChangePassword: customer.mustChangePassword,
      }),
      mustChangePassword: customer.mustChangePassword,
    };
  }

  /**
   * Yagona kirish — telefon + parol, XODIM ham optom mijoz ham shu bilan
   * kiradi (2026-09-18, mijoz talabi: "nega bitta login sahifadan emas").
   *
   * Avval `users.phone` bo'yicha qaraladi; topilmasa `customers.phone`
   * bo'yicha. Ikkalasi ham bir xil raqamda BO'LOLMAYDI (`assertPhoneNot*`
   * yaratish/tahrirlashda tekshiradi — customers-admin.service.ts,
   * staff-admin.service.ts), shuning uchun bu yerda tartib ahamiyatsiz —
   * ikkalasi birdan topilishi mumkin emas.
   *
   * 🔒 Javob har doim bir xil: "raqam yo'q" / "hisob o'chirilgan" /
   *    "parol xato" — uchtasi ham shu matn, qaysi jadvalda ekani ham
   *    oshkor qilinmaydi.
   */
  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: {
        id: true,
        passwordHash: true,
        role: true,
        branchId: true,
        isActive: true,
      },
    });

    if (user) {
      const passwordMatches = await this.validatePassword(
        dto.password,
        user.passwordHash,
      );
      if (!user.isActive || !passwordMatches) {
        throw new UnauthorizedException(INVALID_CREDENTIALS);
      }
      return {
        ...this.generateTokens({
          sub: user.id,
          type: 'USER',
          role: user.role,
          branchId: user.branchId,
        }),
        actorType: 'USER',
        mustChangePassword: false,
      };
    }

    const customer = await this.prisma.customer.findUnique({
      where: { phone: dto.phone },
      select: {
        id: true,
        passwordHash: true,
        branchId: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    const passwordMatches = await this.validatePassword(
      dto.password,
      customer?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!customer || !customer.isActive || !passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return {
      ...this.generateTokens({
        sub: customer.id,
        type: 'CUSTOMER',
        branchId: customer.branchId,
        mustChangePassword: customer.mustChangePassword,
      }),
      actorType: 'CUSTOMER',
      mustChangePassword: customer.mustChangePassword,
    };
  }

  /**
   * Optom mijoz parolni almashtiradi. Birinchi kirishda majburiy.
   *
   * Muvaffaqiyatdan keyin YANGI token juftligi beriladi: eski tokenda
   * `mustChangePassword: true` qolgan va u bilan mijoz hamon to'silgan
   * bo'lardi.
   */
  async changeWholesalePassword(
    actor: Actor,
    dto: ChangePasswordDto,
  ): Promise<WholesaleTokensResponseDto> {
    // Xodim tokeni bilan kelinsa — bu endpoint unga emas. Tekshiruvsiz
    // xodim `sub` i `customers` jadvalidan qidirilardi (va topilmasdi).
    // Xodim parolini almashtirish alohida task.
    if (actor.type !== 'CUSTOMER') {
      throw new UnauthorizedException('Bu endpoint optom mijozlar uchun');
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: actor.id },
      select: { id: true, passwordHash: true, branchId: true, isActive: true },
    });

    if (!customer || !customer.isActive) {
      throw new UnauthorizedException('Hisob mavjud emas yoki faol emas');
    }

    const oldMatches = await this.validatePassword(
      dto.oldPassword,
      customer.passwordHash,
    );
    if (!oldMatches) {
      throw new UnauthorizedException('Joriy parol xato');
    }

    // Yangi parol eskisi bilan bir xilmi — satrlarni emas, HASHni tekshiramiz:
    // bcrypt 72 baytdan keyingi qismni e'tiborga olmaydi, ya'ni uzun
    // parollarda "boshqa satr" aslida ayni parol bo'lib chiqishi mumkin.
    const sameAsOld = await this.validatePassword(
      dto.newPassword,
      customer.passwordHash,
    );
    if (sameAsOld) {
      throw new BadRequestException(
        'Yangi parol joriy paroldan farq qilishi kerak',
      );
    }

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: await this.hashPassword(dto.newPassword),
        mustChangePassword: false,
      },
    });

    return {
      ...this.generateTokens({
        sub: customer.id,
        type: 'CUSTOMER',
        branchId: customer.branchId,
        mustChangePassword: false,
      }),
      mustChangePassword: false,
    };
  }

  /**
   * Refresh token orqali yangi juftlik — xodim va optom mijoz uchun.
   *
   * Rol, filial va parol holati tokendan EMAS, bazadan qayta o'qiladi —
   * xodim boshqa filialga o'tkazilgan yoki roli o'zgargan bo'lsa, yangi
   * token yangi holatni oladi. Hisob o'chirilgan bo'lsa — 401.
   */
  async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokensResponseDto> {
    const payload = this.verifyRefreshToken(dto.refreshToken);

    if (payload.type === 'CUSTOMER') {
      return this.refreshCustomerTokens(payload.sub);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, branchId: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }

    return this.generateTokens({
      sub: user.id,
      type: 'USER',
      role: user.role,
      branchId: user.branchId,
    });
  }

  /**
   * Joriy xodim profili — tokendagi `sub` bo'yicha bazadan o'qiladi.
   *
   * 🔒 `passwordHash` `select` ga kirmaydi, ya'ni javobga chiqishi
   *    tuzilma darajasida imkonsiz.
   */
  async getProfile(actor: Actor): Promise<UserProfileResponseDto> {
    // Optom mijoz tokeni bilan kelinsa — bu endpoint unga emas. Tekshiruvsiz
    // `sub` (mijoz id) `users` jadvalidan qidirilib, tasodifan "hisob yo'q"
    // 401 chiqardi; sababi esa tushunarsiz bo'lardi.
    if (actor.type !== 'USER') {
      throw new UnauthorizedException(
        'Bu endpoint xodimlar uchun. Optom mijoz profili — mijoz kabinetida.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: USER_PROFILE_SELECT,
    });

    // Token yaroqli, lekin hisob o'chirilgan yoki foydalanuvchi yo'q —
    // profil berilmaydi.
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Hisob mavjud emas yoki faol emas');
    }

    // Maydonlar qo'lda ko'chiriladi (spread emas): javob shakli shu yerda
    // aniq ko'rinadi va `isActive` kabi ichki holat javobga tushib qolmaydi.
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId,
      telegramUsername: user.telegramUsername,
    };
  }

  /**
   * Optom mijoz uchun yangi juftlik.
   *
   * `mustChangePassword` bazadan o'qiladi: admin parolni qayta tiklagan
   * bo'lsa (`/admin/customers/:id/reset-password`), mijozning qo'lidagi eski
   * refresh token yangi juftlikni ALLAQACHON to'silgan holatda oladi.
   */
  private async refreshCustomerTokens(
    customerId: string,
  ): Promise<AuthTokensResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        branchId: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    if (!customer || !customer.isActive) {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }

    return this.generateTokens({
      sub: customer.id,
      type: 'CUSTOMER',
      branchId: customer.branchId,
      mustChangePassword: customer.mustChangePassword,
    });
  }

  /**
   * Refresh token'ni tekshiradi. Imzo, kalit yoki muddat xato bo'lsa — 401.
   * JwtService verify xatolarini tashqariga chiqarmaydi (ular 500 bo'lib
   * ketardi va ichki tafsilotni oshkor qilardi).
   */
  private verifyRefreshToken(token: string): TokenPayload {
    try {
      return this.jwtService.verify<TokenPayload>(token, {
        secret: this.config.jwt.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token yaroqsiz yoki muddati tugagan',
      );
    }
  }
}
