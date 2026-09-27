import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Satr bo'lsa — chetdagi bo'shliqlar olib tashlanadi (bo'sh ism o'tmasin). */
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Raqam, `+`, bo'shliq, qavs va tire — odam qanday yozsa shunday. Saqlashdan
 * oldin servis uni bitta ko'rinishga keltiradi (`normalizeLeadPhone`).
 */
const PHONE_INPUT_PATTERN = /^\+?[\d\s()-]{9,25}$/;

/**
 * POST /leads — saytdagi aloqa formasi (T-013).
 *
 * Mehmonning hisobi yo'q (CLAUDE.md qoida 4): bu buyurtma EMAS, faqat
 * "menga qo'ng'iroq qiling" iltimosi.
 */
export class CreateLeadDto {
  @ApiProperty({ example: 'Aziz', minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Ismingizni kiriting' })
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: '+998 90 123 45 67',
    description:
      'Telefon — bo‘shliq, qavs, tire bilan ham bo‘ladi. 9 xonali mahalliy ' +
      'raqamga `+998` o‘zi qo‘shiladi.',
  })
  @IsString()
  @Matches(PHONE_INPUT_PATTERN, { message: 'Telefon raqami noto‘g‘ri' })
  phone!: string;

  @ApiProperty({
    example: 'Hammom uchun 20 m² keramogranit kerak, narxini bilsam',
    maxLength: 2000,
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Xabarni yozing' })
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({
    description:
      'Mehmon tanlagan do‘kon (`GET /branches` dagi `id`). Berilmasa — ' +
      'murojaatni markaz ko‘radi.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  branchId?: string;

  /**
   * 🔒 Bot tuzog'i (honeypot). Formada ko'rinmas maydon — odam uni
   *    to'ldirmaydi, forma to'ldiruvchi bot esa hamma maydonni yozadi.
   *    To'lgan bo'lsa servis murojaatni JIMGINA tashlaydi va baribir 201
   *    qaytaradi — bot "o'tdim" deb o'ylasin, usulini o'zgartirmasin.
   */
  @ApiPropertyOptional({
    description:
      'Har doim BO‘SH yuboriladi (formada yashirin maydon). To‘ldirilgan ' +
      'so‘rov saqlanmaydi.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}
