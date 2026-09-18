import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { BranchScopeService } from '../../auth/branch-scope.service';
import type { Actor } from '../../common/types/actor';
import { PrismaService } from '../../prisma';
import type {
  CustomerProfileResponseDto,
  ResetPasswordResponseDto,
} from './dto';
import { generateTemporaryPassword } from './temp-password';

/** Mijoz topilmagani va begona filial mijozi uchun YAGONA matn. */
const CUSTOMER_NOT_FOUND = 'Mijoz topilmadi';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly branchScope: BranchScopeService,
  ) {}

  /**
   * Mijozning O'Z profili — kabinet sarlavhasi uchun (B-065).
   *
   * 🔒 Mijoz ID si TOKENDAN olinadi, so'rovda umuman yo'q — boshqa
   *    mijozning profilini so'rashning yo'li ham yo'q (IDOR emas).
   *
   * ⚠ Hisob o'chirilgan bo'lsa 401: token hali amal qilayotgan bo'lishi
   *   mumkin, lekin hisob bloklangan bo'lsa u ishlamasligi kerak.
   *   `JwtAuthGuard` buni allaqachon tekshiradi, bu — ikkinchi to'siq
   *   (token bilan hisob orasida poyga bo'lsa).
   */
  async getMyProfile(actor: Actor): Promise<CustomerProfileResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: actor.id },
      select: {
        id: true,
        login: true,
        companyName: true,
        contactName: true,
        phone: true,
        inn: true,
        mustChangePassword: true,
        isActive: true,
        branch: { select: { id: true, name: true, city: true } },
      },
    });

    if (!customer || !customer.isActive) {
      throw new UnauthorizedException('Hisob mavjud emas yoki faol emas');
    }

    // `isActive` faqat tekshiruv uchun so'raldi — javobga chiqmaydi
    return {
      id: customer.id,
      login: customer.login,
      companyName: customer.companyName,
      contactName: customer.contactName,
      phone: customer.phone,
      inn: customer.inn,
      branch: customer.branch,
      mustChangePassword: customer.mustChangePassword,
    };
  }

  /**
   * Optom mijozga yangi vaqtinchalik parol beradi (B-017).
   *
   * 🔒 Filial izolyatsiyasi `BranchScopeService` zimmasida (B-051) — qoida
   *    shu yerda takrorlanmaydi, aks holda u vaqt o'tib boshqa servislardagi
   *    nusxalaridan farq qila boshlardi.
   */
  async resetPassword(
    actor: Actor | undefined,
    customerId: string,
  ): Promise<ResetPasswordResponseDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, phone: true, branchId: true },
    });

    // Mavjud emas va "begona filial" — foydalanuvchi uchun BIR XIL javob.
    if (!customer) throw new NotFoundException(CUSTOMER_NOT_FOUND);
    this.branchScope.assertWithinScope(
      actor,
      customer.branchId,
      CUSTOMER_NOT_FOUND,
    );

    const temporaryPassword = generateTemporaryPassword();

    await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: await this.authService.hashPassword(temporaryPassword),
        // Mijoz shu parol bilan kirgach, uni almashtirmaguncha boshqa
        // hech qayerga o'tolmaydi (PasswordChangeRequiredGuard).
        mustChangePassword: true,
      },
    });

    return {
      temporaryPassword,
      // 2026-09-18: mijoz endi TELEFON bilan kiradi, login satri bilan
      // emas — admin buni aynan mijozga aytadigan qilib qaytaramiz.
      phone: customer.phone,
      mustChangePassword: true,
    };
  }
}
