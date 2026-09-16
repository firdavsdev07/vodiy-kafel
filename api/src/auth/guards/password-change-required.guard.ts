import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { TokenPayload } from '../../common/types/token-payload';

/**
 * Vaqtinchalik parol bilan ishlashni to'sadi (B-017, 4-qadam).
 *
 * Admin bergan vaqtinchalik parol telefon yoki Telegram orqali uzatiladi —
 * ya'ni u zaif sir: admin ham biladi, xabarlar tarixida ham qoladi. Shuning
 * uchun u bilan faqat BITTA ish qilinadi — parolni almashtirish.
 *
 * ⚠ Bu guard `JwtAuthGuard` DAN KEYIN qo'yiladi (u `request.user` ni
 *   to'ldiradi):
 *     @UseGuards(JwtAuthGuard, PasswordChangeRequiredGuard)
 *
 * ⚠ `/auth/wholesale/change-password` ga qo'yilmaydi — aks holda mijoz
 *   parolni almashtira olmay, qulflanib qolardi.
 *
 * 403 (401 emas): token YAROQLI, shunchaki bu hisob hozircha faqat bitta
 * amalga haqli. 401 bo'lsa frontend "qayta kir" deb aylanma hosil qilardi.
 *
 * 📌 Mijoz endpointlari (kalkulyator B-027 dan boshlab) shu guard bilan
 *    qulflanadi.
 */
@Injectable()
export class PasswordChangeRequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const payload = (request as Request & { user?: TokenPayload }).user;

    if (payload?.mustChangePassword) {
      throw new ForbiddenException(
        'Avval vaqtinchalik parolni almashtiring: POST /auth/wholesale/change-password',
      );
    }

    return true;
  }
}
