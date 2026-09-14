import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Actor } from '../../common/types/actor';
import { actorFromToken } from '../../common/types/actor';
import type { TokenPayload } from '../../common/types/token-payload';

/**
 * Joriy subyekt — xodim yoki optom mijoz (B-051).
 *
 *   @Get('narxlar')
 *   list(@CurrentActor() actor: Actor) { ... }
 *
 * ⚠ Qiymat `undefined` bo'lishi MUMKIN: `JwtAuthGuard` qo'yilmagan ochiq
 *   endpointda (katalog, mehmon) token yo'q. Shuning uchun tur
 *   `Actor | undefined` — "mehmon" holatini e'tibordan chetda qoldirib
 *   bo'lmaydi, TypeScript uni majburlaydi.
 */
export const CurrentActor = createParamDecorator(
  (_data: undefined, context: ExecutionContext): Actor | undefined => {
    const request = context.switchToHttp().getRequest<Request>();
    const payload = (request as Request & { user?: TokenPayload }).user;
    return payload ? actorFromToken(payload) : undefined;
  },
);
