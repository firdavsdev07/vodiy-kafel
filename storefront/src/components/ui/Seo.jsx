import { useLocation } from 'react-router-dom'

import { SITE_URL } from '@/lib/site'

/**
 * Sahifaga xos sarlavha va meta teglar (S-036).
 *
 * Kutubxona KERAK EMAS: React 19 `<title>`, `<meta>` va `<link>` ni
 * daraxtning istalgan joyidan `<head>` ga o'zi ko'chiradi. Shuning
 * uchun bu komponent shunchaki shu teglarni qaytaradi.
 *
 * ⚠ Bir sahifada BITTA `<Seo>` bo'lsin. Ikkitasi bo'lsa React
 *   ikkalasini ham `<head>` ga qo'yadi va qaysi biri ustun ekani
 *   aniq bo'lmay qoladi.
 *
 * ⚠ `og:image` — LOGOTIP, mahsulot surati EMAS. Katalogdagi hamma
 *   surat Marazzi'niki (ASSETS.md, S-033); ularni ijtimoiy tarmoq
 *   kartochkasida tarqatish huquqi bizda yo'q. S-033 hal bo'lgach
 *   bu yerga haqiqiy 1200×630 kartochka surati qo'yiladi.
 */

const SITE_NAME = 'Vodiy Kafel'
const DEFAULT_DESCRIPTION =
  "Vodiy Kafel — Farg'ona vodiysida premium keramika va keramogranit. 20 yildan ortiq tajriba, 50 000+ mijoz."
/**
 * ⚠ `logo.png` EMAS: u 1211×1211 va 1.45 MB. Kartochka uchun har
 *   havolada shuncha tortilardi va ko'p robot kutmay tashlab ketardi.
 *   `og-card.png` — 1200×630 (ijtimoiy tarmoq standarti), 64 KB.
 *   `scripts/generate-og.mjs` yasaydi.
 */
const DEFAULT_IMAGE = '/images/og-card.png'

export default function Seo({ title, description, image, type = 'website', noindex = false }) {
  const { pathname } = useLocation()

  // Sarlavha: sahifa nomi + brend. Bosh sahifada takrorlanmasin.
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME}® — Premium keramik yuzalar`
  const text = description || DEFAULT_DESCRIPTION
  const canonical = `${SITE_URL}${pathname === '/' ? '' : pathname}`
  const imageUrl = `${SITE_URL}${image || DEFAULT_IMAGE}`

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={text} />
      {/* Bir xil kontentga ikki manzil bo'lmasin (masalan `?intro=1` bilan). */}
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="uz_UZ" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={text} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />

      {/* `summary_large_image` — Telegram va WhatsApp ham shu teglarni
          o'qiydi, faqat Twitter uchun emas. */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={text} />
      <meta name="twitter:image" content={imageUrl} />
    </>
  )
}
