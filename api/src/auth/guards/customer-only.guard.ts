import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { TokenPayload } from '../../common/types/token-payload';

/**
 * Faqat optom mijoz tokeni (B-027).
 *
 * `RolesGuard` teskarisini qiladi — faqat xodimni o'tkazadi. Mijoz
 * endpointlarida (kalkulyator, buyurtma, kabinet) xodim tokeni ham rad
 * etilishi kerak: xodimda mijoz yo'q, demak "qaysi mijozning narxi?"
 * savoliga javob yo'q.
 *
 * ⚠ `JwtAuthGuard` DAN KEYIN qo'yiladi:
 *     @UseGuards(JwtAuthGuard, CustomerOnlyGuard, PasswordChangeRequiredGuard)
 */
@Injectable()
export class CustomerOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const payload = (request as Request & { user?: TokenPayload }).user;

    if (payload?.type !== 'CUSTOMER') {
      throw new ForbiddenException('Bu amal faqat optom mijoz uchun');
    }
    return true;
  }
}
