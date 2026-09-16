import { ApiProperty } from '@nestjs/swagger';

/**
 * O'lcham — OCHIQ javob. Katalogda filtr ro'yxati uchun (TZ 3.8).
 *
 * `label` ko'rsatish uchun, `widthCm`/`heightCm` esa frontend o'zi
 * saralashi yoki guruhlashi uchun (masalan "kvadrat" / "to'g'ri burchakli").
 */
export class SizePublicResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({
    description: 'Ko‘rinadigan yozuv — o‘lchamlardan avtomatik yasaladi',
    example: '60x60',
  })
  label!: string;

  @ApiProperty({ description: 'Eni, sm', example: 60 })
  widthCm!: number;

  @ApiProperty({ description: 'Bo‘yi, sm', example: 60 })
  heightCm!: number;
}
