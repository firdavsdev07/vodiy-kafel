import { ApiProperty } from '@nestjs/swagger';

/**
 * POST /admin/customers/:id/reset-password javobi.
 *
 * ⚠ Vaqtinchalik parol javobda OCHIQ matnda keladi — bu ataylab: uni admin
 *   mijozga telefon yoki Telegram orqali yetkazishi kerak (B-017 oqimi,
 *   3-qadam). Bazada faqat hash saqlanadi, shuning uchun bu YAGONA imkoniyat:
 *   javob yo'qolsa parolni qayta tiklashdan boshqa yo'l qolmaydi.
 */
export class ResetPasswordResponseDto {
  @ApiProperty({
    description:
      'Yangi vaqtinchalik parol. Faqat SHU javobda ko‘rinadi — saqlab ' +
      'qo‘ying va mijozga yetkazing.',
    example: 'Kp7mQx4rTn92',
  })
  temporaryPassword!: string;

  @ApiProperty({
    description: 'Parol tiklangan mijozning logini',
    example: 'fargona-optom',
  })
  login!: string;

  @ApiProperty({
    description:
      'Har doim `true`: mijoz shu parol bilan kirgach uni almashtirishi shart.',
    example: true,
  })
  mustChangePassword!: boolean;
}
