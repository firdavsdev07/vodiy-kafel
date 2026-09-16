/**
 * Mahsulot/zavod nomidan URL-slug yasaydi (masalan katalog manzili uchun:
 * `/products/lyuks-keramogranit-60x60`).
 *
 * O'zbekcha lotin apostroflari (o', g' — turli tirnoqcha belgilari bilan
 * yozilishi mumkin: ' ’ ‘ `) olib tashlanadi, qolgan harf/raqam bo'lmagan
 * belgilar bittadan tire bilan almashtiriladi.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/['’‘`]/g, '')
    .replace(/[̀-ͯ]/g, '') // diakritik belgilar (NFKD dan qolgan)
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
