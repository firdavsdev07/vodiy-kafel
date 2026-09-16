import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';
import type { TokenPayload } from '../../common/types/token-payload';
import { AppConfigService } from '../../config';

/**
 * Access token strategiyasi — `Authorization: Bearer <token>`.
 *
 * ⚠ Faqat ACCESS kalitini biladi (JWT_SECRET). Refresh token boshqa kalit
 *   bilan imzolangani uchun himoyalangan endpointga o'tolmaydi.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwt.secret,
    });
  }

  validate(payload: TokenPayload): TokenPayload {
    return payload;
  }
}
