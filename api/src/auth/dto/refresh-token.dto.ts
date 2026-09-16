import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

/** POST /auth/refresh — amaldagi refresh token o‘rniga yangi juftlik olish. */
export class RefreshTokenDto {
  @ApiProperty({
    description:
      'Kirish paytida berilgan `refreshToken`. Access token bu yerda ' +
      'ISHLAMAYDI — refresh token boshqa kalit bilan imzolanadi.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  @IsJWT()
  refreshToken!: string;
}
