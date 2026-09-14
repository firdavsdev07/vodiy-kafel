import { ApiProperty } from '@nestjs/swagger';

/**
 * Kirish va refresh javobida qaytadigan token juftligi.
 *
 * 🔒 Parol yoki uning hashi bu javobda hech qachon bo'lmaydi.
 */
export class AuthTokensResponseDto {
  @ApiProperty({
    description:
      'Access token. `Authorization: Bearer <token>` sarlavhasida yuboriladi.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description:
      'Refresh token. Access token muddati tugaganda `/auth/refresh` ' +
      'endpointiga yuboriladi. Access token bilan almashtirib bo‘lmaydi.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken!: string;
}
