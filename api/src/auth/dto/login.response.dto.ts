import { ApiProperty } from '@nestjs/swagger';

/**
 * POST /auth/login javobi (2026-09-18).
 *
 * ⚠ `actorType` — frontend shu yerdan bilib oladi: xodim panelimi
 *   (`/`), kabinetmi (`/kabinet`). Tokenning o'zida ham `type` bor,
 *   lekin uni ochish uchun JWT dekodlash kerak bo'lardi — bu maydon
 *   shuni ANIQ, ochiq beradi.
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'Access token. `Authorization: Bearer <token>` sarlavhasida.',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh token. Muddati tugaganda `/auth/refresh` ga.',
  })
  refreshToken!: string;

  @ApiProperty({
    enum: ['USER', 'CUSTOMER'],
    description: 'Kim kirdi — xodim (`USER`) yoki optom mijoz (`CUSTOMER`).',
    example: 'USER',
  })
  actorType!: 'USER' | 'CUSTOMER';

  @ApiProperty({
    description:
      'Vaqtinchalik parol hali almashtirilmagan. Xodimda bu tushuncha ' +
      'yo‘q — har doim `false`. Mijozda `true` bo‘lsa boshqa hamma ' +
      'endpoint 403 (`PasswordChangeRequiredGuard`).',
    example: false,
  })
  mustChangePassword!: boolean;
}
