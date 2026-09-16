import { ApiProperty } from '@nestjs/swagger';

/** POST /auth/logout javobi. */
export class LogoutResponseDto {
  @ApiProperty({
    example: 'Tizimdan chiqdingiz — tokenlarni o‘chiring',
    description:
      'Ma’lumot uchun matn. Server tomonda hech narsa o‘zgarmaydi: ' +
      'tokenni o‘chirish frontend zimmasida.',
  })
  message!: string;
}
