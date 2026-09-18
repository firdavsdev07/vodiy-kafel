import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * POST /auth/login — YAGONA umumiy kirish (2026-09-18, mijoz talabi).
 *
 * ⚠ TARIX: avval xodim telefon bilan (`/auth/admin/login`), optom mijoz
 *   login satri bilan (`/auth/wholesale/login`) — ikki xil sahifadan
 *   kirardi. Mijoz buni chalkash deb topdi: "nega optom mijoz ham
 *   telefon+parol bilan, bitta login sahifadan kirmaydi?". Javob — buni
 *   qilishga hech qanday texnik to'siq yo'q edi, faqat oldingi qaror
 *   shunday edi. Endi IKKALASI HAM shu bitta yo'ldan, telefon bilan kiradi.
 *
 * Eski ikkita endpoint (`/auth/admin/login`, `/auth/wholesale/login`)
 * ATAYLAB o'chirilmadi — API to'liqligi va orqaga moslik uchun qoldi,
 * lekin dashboard login sahifasi endi FAQAT shu yerga murojaat qiladi.
 */
export class LoginDto {
  @ApiProperty({
    description:
      'Telefon raqami — xodim ham, optom mijoz ham shu bilan kiradi.',
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
  @MaxLength(72)
  password!: string;
}
