#!/usr/bin/env node
/**
 * Tezlik byudjeti (S-042).
 *
 * `pnpm build` dan KEYIN ishlaydi va birinchi ekranda yuklanadigan
 * JS hajmini o'lchaydi. Byudjetdan oshsa OGOHLANTIRADI.
 *
 * ⚠ Build'ni YIQITMAYDI (`exit 0`). Sabab: byudjet — nazorat vositasi,
 *   darvoza emas. Bitta kutubxona qo'shilib chegaradan 3 KB oshgani
 *   uchun deploy to'xtab qolsa, odamlar byudjetni o'chirib qo'yadi.
 *   Yiqitish kerak bo'lsa `--strict` bilan chaqiriladi (CI uchun).
 *
 * O'lchov — GZIP hajmi: tarmoqdan aynan shu o'tadi.
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(HERE, '../dist')

/** Chegaralar — `task.txt` S-042 dan. */
const BUDGET = {
  /** Birinchi ekranda so'raladigan JS (gzip). */
  firstScreenJsKb: 150,
  /** Bitta rasm — undan kattasi mobil trafikni yeb qo'yadi. */
  singleImageKb: 200,
}

const strict = process.argv.includes('--strict')
const kb = (bytes) => Math.round(bytes / 1024)

/**
 * Birinchi ekranda so'raladigan modullar.
 *
 * `index.html` dagi `<script>` va `modulepreload` — bu aniq qism.
 * Lekin undan tashqari GSAP va Lenis ham BIRINCHI EKRANDA so'raladi:
 * `Layout` doim mount bo'ladi (kursor, Lenis, ScrollTrigger) — buni
 * `vite.config.js` ning o'zi izohda yozib qo'ygan.
 *
 * Ular dinamik `import()` orqali keladi, ya'ni HTML'da ko'rinmaydi.
 * Shuning uchun QO'LDA qo'shiladi — aks holda byudjet o'zini
 * aldaydi: hisobda 104 KB, tarmoqda esa 160 KB.
 */
const ALWAYS_LOADED = [/vendor-gsap/, /vendor-lenis/]

async function firstScreenScripts() {
  const html = await readFile(join(DIST, 'index.html'), 'utf8')
  const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1])

  const assets = await readdir(join(DIST, 'assets'))
  for (const name of assets) {
    if (name.endsWith('.js') && ALWAYS_LOADED.some((rx) => rx.test(name))) {
      refs.push(`/assets/${name}`)
    }
  }
  return [...new Set(refs)]
}

async function gzipKb(relativePath) {
  const file = join(DIST, relativePath.replace(/^\//, ''))
  return kb(gzipSync(await readFile(file)).length)
}

const problems = []

// ── 1. Birinchi ekran JS ──
const scripts = await firstScreenScripts()
let jsTotal = 0
const rows = []
for (const path of scripts) {
  const size = await gzipKb(path)
  jsTotal += size
  rows.push([size, path])
}

console.log('\nBirinchi ekran JS (gzip):')
for (const [size, path] of rows.sort((a, b) => b[0] - a[0])) {
  console.log(`  ${String(size).padStart(4)} KB  ${path}`)
}
console.log(`  ${'─'.repeat(40)}`)
console.log(`  ${String(jsTotal).padStart(4)} KB  JAMI (byudjet ${BUDGET.firstScreenJsKb} KB)`)

if (jsTotal > BUDGET.firstScreenJsKb) {
  problems.push(`Birinchi ekran JS ${jsTotal} KB — byudjetdan ${jsTotal - BUDGET.firstScreenJsKb} KB oshdi`)
}

// ── 2. Eng katta rasmlar ──
const imagesDir = join(DIST, 'images')
const big = []
async function walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) await walk(full)
    else {
      const { size } = await stat(full)
      // Rasm allaqachon siqilgan (webp) — gzip qilinmaydi.
      if (kb(size) > BUDGET.singleImageKb) big.push([kb(size), full.replace(DIST, '')])
    }
  }
}
await walk(imagesDir)

if (big.length) {
  console.log(`\n${BUDGET.singleImageKb} KB dan katta rasmlar:`)
  for (const [size, path] of big.sort((a, b) => b[0] - a[0])) {
    console.log(`  ${String(size).padStart(4)} KB  ${path}`)
  }
  problems.push(`${big.length} ta rasm ${BUDGET.singleImageKb} KB dan katta`)
}

// ── Xulosa ──
if (problems.length === 0) {
  console.log('\n✅ Byudjet saqlangan\n')
} else {
  console.log('')
  for (const problem of problems) console.log(`⚠  ${problem}`)
  console.log(
    strict
      ? '\nByudjet buzildi (--strict) — build to‘xtatildi\n'
      : '\n⚠ Byudjet buzildi. Build to‘xtatilmadi — bu ogohlantirish.\n',
  )
  if (strict) process.exit(1)
}
