#!/usr/bin/env node
/**
 * Ijtimoiy tarmoq kartochkasi va kichik logotip (S-036, S-042).
 *
 * ⚠ NEGA KERAK BO'LDI: `public/images/logo.png` — 1211×1211, 1.45 MB.
 *   U `og:image` sifatida ishlatilgani uchun Telegram/WhatsApp har
 *   bir havola uchun 1.45 MB tortardi. Ko'p robot bunchasini kutmaydi
 *   va kartochka UMUMAN chiqmasdi.
 *
 * Yasaladigan fayllar:
 *   `og-card.png`  — 1200×630, ijtimoiy tarmoq standarti
 *   `logo-512.png` — saytda kerak bo'lganda ishlatish uchun
 *
 * ⚠ Bu VAQTINCHA yechim: kartochkada faqat logotip va fon bor.
 *   Haqiqiy dizayn qilingan kartochka S-033 (Marazzi rasmlari) hal
 *   bo'lgandan keyin qo'yiladi — hozir bizda tarqatishga haqli
 *   birorta ham surat yo'q.
 */
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { stat } from 'node:fs/promises'

const HERE = dirname(fileURLToPath(import.meta.url))
const IMAGES = resolve(HERE, '../public/images')
/**
 * ⚠ Manba `public/` DAN TASHQARIDA: `public/` dagi hamma narsa
 *   `dist/` ga ko'chiriladi, ya'ni 1.45 MB lik asl fayl har deployda
 *   serverga chiqardi — hech kim so'ramasa ham. Endi u faqat shu
 *   skript uchun turadi.
 */
const SOURCE = resolve(HERE, 'assets/logo-source.png')

/** Saytning qog'oz foni (`--color-bone`). */
const BONE = { r: 238, g: 236, b: 229, alpha: 1 }

const kb = async (path) => Math.round((await stat(path)).size / 1024)

// ── 1200×630 kartochka: logotip markazda, atrofida havo ──
const logo = await sharp(SOURCE).resize(420, 420, { fit: 'inside' }).png().toBuffer()

await sharp({ create: { width: 1200, height: 630, channels: 4, background: BONE } })
  .composite([{ input: logo, gravity: 'center' }])
  .png({ compressionLevel: 9, palette: true })
  .toFile(resolve(IMAGES, 'og-card.png'))

// ── Kichik logotip ──
await sharp(SOURCE)
  .resize(512, 512, { fit: 'inside' })
  .png({ compressionLevel: 9, palette: true })
  .toFile(resolve(IMAGES, 'logo-512.png'))

console.log(`og-card.png  : ${await kb(resolve(IMAGES, 'og-card.png'))} KB (1200×630)`)
console.log(`logo-512.png : ${await kb(resolve(IMAGES, 'logo-512.png'))} KB`)
console.log(`manba        : ${await kb(SOURCE)} KB (deploy QILINMAYDI)`)
