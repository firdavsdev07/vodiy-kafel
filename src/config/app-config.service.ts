import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TokenLifetime } from '../common/types/token-lifetime';
import type { Env } from './env.schema';

/**
 * Type-safe config o'quvchi.
 *
 * Kodda hech qachon `process.env` to'g'ridan-to'g'ri ISHLATILMAYDI —
 * faqat shu servis orqali. Shunda har bir qiymat validatsiyadan o'tgan
 * va turi aniq bo'ladi.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  // — Umumiy —
  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.get('PORT');
  }

  get appUrl(): string {
    return this.get('APP_URL');
  }

  // — Ma'lumotlar bazasi —
  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  // — Autentifikatsiya —
  /**
   * Access va refresh tokenlar TURLI kalit bilan imzolanadi — shunda
   * access token `/auth/refresh` da, refresh token esa himoyalangan
   * endpointda ishlamaydi (B-015).
   *
   * `expiresIn` maydonlari `TokenLifetime` turiga keltiriladi: formatni
   * `envSchema` allaqachon tekshirgan (`15m`, `30d`, `900s`), shuning
   * uchun bu yerda satrni turga aylantirish xavfsiz.
   */
  get jwt(): {
    secret: string;
    expiresIn: TokenLifetime;
    refreshSecret: string;
    refreshExpiresIn: TokenLifetime;
  } {
    return {
      secret: this.get('JWT_SECRET'),
      expiresIn: this.get('JWT_EXPIRES') as TokenLifetime,
      refreshSecret: this.get('JWT_REFRESH_SECRET'),
      refreshExpiresIn: this.get('JWT_REFRESH_EXPIRES') as TokenLifetime,
    };
  }

  // — Hujjatlar —
  get swaggerEnabled(): boolean {
    return this.get('SWAGGER_ENABLED');
  }

  // — Fayl saqlash —
  get uploadDir(): string {
    return this.get('UPLOAD_DIR');
  }

  // — To'lov —
  get payment(): {
    provider: Env['PAYMENT_PROVIDER'];
    mockAutoPaid: boolean;
  } {
    return {
      provider: this.get('PAYMENT_PROVIDER'),
      mockAutoPaid: this.get('PAYMENT_MOCK_AUTO_PAID'),
    };
  }

  // — CORS —
  /** '*' bo'lsa true (hamma ruxsat), aks holda domenlar ro'yxati */
  get corsOrigins(): string[] | true {
    const raw = this.get('CORS_ORIGINS').trim();
    if (raw === '*') return true;
    return raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }
}
