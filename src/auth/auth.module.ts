import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppConfigService } from '../config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BranchScopeService } from './branch-scope.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Auth module — JWT strategiyasi, guard'lar va kirish endpointlari.
 *
 * ⚠ Kalit `process.env` dan EMAS, `AppConfigService` dan olinadi: shunda u
 *   zod validatsiyasidan o'tgan bo'ladi (kamida 32 belgi) va noto'g'ri
 *   sozlamada dastur ishga tushmaydi — jimgina zaif kalit bilan ishlamaydi.
 *
 * `JwtModule` dagi `secret` — access token uchun standart kalit. Refresh
 * token AuthService'da alohida kalit bilan imzolanadi (JWT_REFRESH_SECRET).
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwt.secret,
        signOptions: { algorithm: 'HS256', expiresIn: config.jwt.expiresIn },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    BranchScopeService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    BranchScopeService,
    JwtAuthGuard,
    RolesGuard,
    JwtModule,
  ],
})
export class AuthModule {}
