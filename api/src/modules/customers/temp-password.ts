import { randomInt } from 'node:crypto';

/**
 * Vaqtinchalik parol alifbosi.
 *
 * Chalkashadigan belgilar ATAYLAB olib tashlangan: 0/O, 1/l/I.
 * Parolni admin mijozga OG'ZAKI (telefon orqali) aytadi — "nol yoki katta o?"
 * degan savol qayta-qayta urinishga va oxiri zaifroq parolga olib keladi.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** Uzunlik — 12 belgi. Vaqtinchalik, lekin taxmin qilib bo'lmaydigan. */
const LENGTH = 12;

/**
 * Vaqtinchalik parol generatori.
 *
 * 🔒 `Math.random()` ISHLATILMAYDI — u kriptografik emas va ketma-ket
 *    chaqiriqlardan keyingisini taxmin qilish mumkin. `crypto.randomInt`
 *    esa qiyaliksiz (modulo bias yo'q) tanlaydi.
 */
export const generateTemporaryPassword = (): string =>
  Array.from(
    { length: LENGTH },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join('');
