import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Yangi parolning eng kam uzunligi. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * POST /auth/wholesale/change-password — optom mijoz parolni almashtiradi.
 *
 * Birinchi kirishda MAJBURIY (`mustChangePassword: true`), keyin ixtiyoriy.
 *
 * ⚠ `oldPassword` majburiy: o'g'irlangan yoki qarovsiz qolgan tokendan
 *   parolni almashtirib, hisobni butunlay egallab olishning oldini oladi.
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: 'Joriy parol (birinchi kirishda — admin bergan vaqtinchalik)',
    example: 'Parol123!',
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  oldPassword!: string;

  @ApiProperty({
    description:
      `Yangi parol. Kamida ${MIN_PASSWORD_LENGTH} belgi va joriy paroldan ` +
      'farq qilishi shart.',
    example: 'YangiParol456!',
    minLength: MIN_PASSWORD_LENGTH,
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(72)
  newPassword!: string;
}
