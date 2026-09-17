import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Mijoz biriktirilgan filial — narx aynan shu filialdan keladi. */
export class CustomerProfileBranchDto {
  @ApiProperty({ example: 'cmtyomomq0001ofm24t896smr' })
  id!: string;

  @ApiProperty({ example: "Vodiy Kafel — Farg'ona" })
  name!: string;

  @ApiProperty({ example: "Farg'ona" })
  city!: string;
}

/**
 * Optom mijozning O'Z profili — `GET /me/profile` (B-065).
 *
 * 🔒 Nima YO'Q va bo'lmaydi:
 *    • `passwordHash` — hech qachon
 *    • narx qoidalari — mijoz qaysi chegirma qo'llangani bilmaydi
 *      (CLAUDE.md qoida 11: "sabab hech qayerda chiqarilmaydi")
 *    • biriktirilgan menejer — u `GET /orders/{id}/manager-contact` da,
 *      buyurtma bo'yicha beriladi
 *    • balans — u `GET /me/account` da (B-035)
 */
export class CustomerProfileResponseDto {
  @ApiProperty({ example: 'cmu59j5oz004urjm25rvhvdpo' })
  id!: string;

  @ApiProperty({
    description: 'Admin bergan login (kichik harfda saqlanadi)',
    example: 'fargona-optom',
  })
  login!: string;

  @ApiProperty({ example: "Farg'ona Qurilish MChJ" })
  companyName!: string;

  @ApiProperty({ example: 'Alisher Karimov' })
  contactName!: string;

  @ApiProperty({ example: '+998901234567' })
  phone!: string;

  @ApiPropertyOptional({
    description: 'Soliq to‘lovchi raqami — shartnoma uchun (B-044)',
    type: String,
    nullable: true,
    example: '123456789',
  })
  inn!: string | null;

  @ApiProperty({
    type: CustomerProfileBranchDto,
    description:
      'Biriktirilgan filial. ⚠ Mijoz AYNAN shu filialning narxini ko‘radi ' +
      'va buyurtmani ham unga beradi (CLAUDE.md qoida 5) — shuning uchun ' +
      'kabinet uni ko‘rsatishi kerak.',
  })
  branch!: CustomerProfileBranchDto;

  @ApiProperty({
    description:
      'Vaqtinchalik parol hali almashtirilmagan. ⚠ Bu maydon ATAYLAB shu ' +
      'yerda ham bor: kirish javobidan keyin frontend uni boshqa hech ' +
      'qayerdan bilolmasdi va sahifa yangilanganda yo‘qotardi.',
    example: false,
  })
  mustChangePassword!: boolean;
}
