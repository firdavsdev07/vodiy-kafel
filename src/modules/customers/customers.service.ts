import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { BranchScopeService } from '../../auth/branch-scope.service';
import type { Actor } from '../../common/types/actor';
import { PrismaService } from '../../prisma';
import type { ResetPasswordResponseDto } from './dto';
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
      select: { id: true, login: true, branchId: true },
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
      login: customer.login,
      mustChangePassword: true,
    };
  }
}
