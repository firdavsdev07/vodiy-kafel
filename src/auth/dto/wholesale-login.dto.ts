import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * POST /auth/wholesale/login — optom (B2B) mijoz kirishi.
 *
 * ⚠ Login va parolni ADMIN/MENEJER beradi (CLAUDE.md qoida 4).
 *   Self-registration yo'q — shuning uchun bu yerda "ro'yxatdan o'tish"
 *   maydonlari (kompaniya nomi, INN, telefon) YO'Q.
 */
export class WholesaleLoginDto {
  @ApiProperty({
    description:
      'Admin bergan login. Katta-kichik harf farq qilmaydi — server uni ' +
      'kichik harfga keltirib qidiradi.',
    example: 'fargona-optom',
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  login!: string;

  @ApiProperty({
    description: 'Parol (birinchi kirishda — admin bergan vaqtinchalik parol)',
    example: 'Parol123!',
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty()
  // bcrypt 72 baytdan keyingi belgilarni e'tiborga olmaydi.
  @MaxLength(72)
  password!: string;
}
