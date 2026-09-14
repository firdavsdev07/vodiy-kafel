/**
 * Prisma generatsiya qilgan klientga yagona kirish nuqtasi.
 *
 * `generated/` papkasi loyiha ildizida turadi (src ichida emas), chunki u
 * 8 MB atrofida va git'ga tushmaydi — uni har build'da nusxalash keraksiz.
 *
 * `dist/` papkasi `src/` tuzilishini aynan takrorlagani uchun bu nisbiy yo'l
 * ikkala holatda ham bir xil joyga tushadi:
 *   src/prisma/prisma-client.ts  → <ildiz>/generated/prisma
 *   dist/prisma/prisma-client.js → <ildiz>/generated/prisma
 *
 * ⚠ Butun loyihada Prisma turlari FAQAT shu fayldan import qilinadi.
 *   Boshqa hech qayerda '../../generated/...' yozilmaydi.
 */
export * from '../../generated/prisma';
