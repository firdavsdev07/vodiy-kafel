#!/usr/bin/env node
/**
 * `sitemap.xml` generatsiyasi (S-037).
 *
 * Statik sahifalar har doim yoziladi. Mahsulot va galereya manzillari
 * API'dan olinadi — API yetib bo'lmasa, skript YIQILMAYDI: faqat
 * statik qism bilan yozadi va ogohlantiradi. Sabab: build (masalan
 * Vercel'da) backend o'chiq bo'lsa ham o'tishi kerak.
 *
 * Ishga tushirish:
 *   VITE_API_URL=... VITE_SITE_URL=... node scripts/generate-sitemap.mjs
 * `pnpm build` uni o'zi chaqiradi.
 */
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../public/sitemap.xml')

const SITE = (process.env.VITE_SITE_URL || 'https://vodiykafel.uz').replace(/\/+$/, '')
const API = (process.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/+$/, '')

/** `/track` bu yerda YO'Q — `robots.txt` da ham taqiqlangan. */
const STATIC = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/catalog', priority: '0.9', changefreq: 'weekly' },
  { path: '/categories', priority: '0.7', changefreq: 'monthly' },
  { path: '/gallery', priority: '0.7', changefreq: 'weekly' },
  { path: '/about', priority: '0.5', changefreq: 'yearly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
]

/** XML'da `&`, `<` va `>` xom holda tursa fayl buziladi. */
const escape = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function fetchProducts() {
  const urls = []
  // Sahifama-sahifa: katalog o'sganda ham hammasi tushsin.
  for (let page = 1; page <= 50; page += 1) {
    const response = await fetch(`${API}/products?page=${page}&limit=100`)
    if (!response.ok) throw new Error(`GET /products → ${response.status}`)
    const { data } = await response.json()
    const items = data?.items ?? []
    for (const item of items) urls.push(`/catalog/${item.slug}`)
    if (page >= (data?.totalPages ?? 1)) break
  }
  return urls
}

function render(entries) {
  const today = new Date().toISOString().slice(0, 10)
  const body = entries
    .map(({ path, priority = '0.6', changefreq = 'weekly' }) =>
      [
        '  <url>',
        `    <loc>${escape(SITE + path)}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>',
      ].join('\n'),
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

const entries = [...STATIC]

try {
  const products = await fetchProducts()
  for (const path of products) entries.push({ path, priority: '0.8', changefreq: 'monthly' })
  console.log(`sitemap: ${products.length} ta mahsulot API'dan olindi`)
} catch (error) {
  // Build to'xtamaydi — statik qism baribir foydali.
  console.warn(`sitemap: API'ga ulanib bo'lmadi (${error.message}) — faqat statik sahifalar yozildi`)
}

await writeFile(OUT, render(entries), 'utf8')
console.log(`sitemap: ${entries.length} ta manzil → public/sitemap.xml`)
