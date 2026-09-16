import { PartialType } from '@nestjs/swagger';
import { CreateSizeDto } from './create-size.dto';

/**
 * O'lchamni tahrirlash (B-019).
 *
 * ⚠ Eni yoki bo'yi o'zgarsa `label` QAYTA hisoblanadi.
 *
 *   Bu [[update-factory.dto]] dagi qaror bilan ziddek ko'rinadi (u yerda
 *   `slug` nom o'zgarganda ham qotib qoladi), lekin farq muhim:
 *     • `slug` — TASHQI IDENTIFIKATOR (URL). O'zgarsa havolalar buziladi.
 *     • `label` — o'lchamning TAVSIFI. O'zgarmasa yolg'onga aylanadi:
 *       eni 30 ga o'zgargan yozuv hamon "60x60" deb turishi mumkin emas.
 */
export class UpdateSizeDto extends PartialType(CreateSizeDto) {}
