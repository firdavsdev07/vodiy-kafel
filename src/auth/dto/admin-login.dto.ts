import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * POST /auth/admin/login — xodim (SUPER_ADMIN, MODERATOR, BRANCH_ADMIN,
 * MANAGER) kirishi.
 *
 * ⚠ Dekoratorlar majburiy: global `ValidationPipe({ whitelist: true })`
 * DTO'da e'lon qilinmagan maydonni jimgina olib tashlaydi — dekoratorsiz
 * `phone` har doim `undefined` bo'lib qoladi.
 */
export class AdminLoginDto {
  @ApiProperty({
    description: 'Xodimning telefon raqami (bazadagi ko‘rinishida)',
    example: '+998900000001',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone!: string;

  @ApiProperty({
    description: 'Parol',
    example: 'Parol123!',
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty()
  // bcrypt 72 baytdan keyingi belgilarni e'tiborga olmaydi — uzunroq
  // qiymatni qabul qilishdan ma'no yo'q (va bu hash xarajatini cheklaydi).
  @MaxLength(72)
  password!: string;
}
