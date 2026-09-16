import { ApiProperty } from '@nestjs/swagger';
import { AuthTokensResponseDto } from './auth-tokens.response.dto';

/**
 * Optom mijoz kirishi javobi — token juftligi + parol holati.
 *
 * `mustChangePassword: true` bo'lsa frontend darhol parol almashtirish
 * oynasini ko'rsatishi kerak. Lekin bu shunchaki maslahat EMAS: token
 * ichida ham shu bayroq bor va `PasswordChangeRequiredGuard` mijozni
 * boshqa endpointlarga qo'ymaydi — frontend uni chetlab o'tolmaydi.
 */
export class WholesaleTokensResponseDto extends AuthTokensResponseDto {
  @ApiProperty({
    description:
      'Vaqtinchalik parol hali almashtirilmagan. `true` bo‘lsa mijoz ' +
      '`/auth/wholesale/change-password` dan boshqa endpointlarga o‘tolmaydi.',
    example: true,
  })
  mustChangePassword!: boolean;
}
