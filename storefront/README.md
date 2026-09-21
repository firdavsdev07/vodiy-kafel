# Vodiy Kafel

Public ceramic-material gallery built with React, JavaScript, Vite, Tailwind CSS, React Router, GSAP, Lenis and React Three Fiber.

## Local development

```sh
pnpm install
pnpm dev
```

Visit `/?intro=1` to review the entrance. Normal visits skip it after the user has entered during the same session.

## Muhit o'zgaruvchilari

| O'zgaruvchi         | Nimaga kerak                                    |
| ------------------- | ----------------------------------------------- |
| `VITE_API_URL`      | Backend manzili, `/api/v1` prefiksi BILAN        |
| `VITE_SITE_URL`     | `canonical`, `og:url`, `sitemap.xml`             |
| `VITE_CABINET_URL`  | «Optom kirish» tugmasi manzili (`dashboard/`)    |

Namunasi — `.env.example`. Hech biri majburiy emas: berilmasa
`src/shared/api/config.js` va `src/lib/site.js` dagi zaxira
qiymatlar ishlatiladi (dev'da localhost, prod'da joriy domen).

## API bilan birga ishga tushirish

```sh
# 1-terminal — backend (api/ paketida)
cd ../api && pnpm start:dev        # http://localhost:3000/api/v1

# 2-terminal — sayt
pnpm dev                           # http://localhost:5173
```

Backend o'chiq bo'lsa sayt YIQILMAYDI: manzil, katalog va galereya
bo'limlari o'z xato holatini ko'rsatadi, qolgan sayt ishlayveradi.

⚠ **Backend `CORS_ORIGINS`** hozir `*` turibdi (`api/.env`).
Production'da u sayt domeniga almashtirilishi kerak — bu `api/`
tomondagi ish.

## Deploy (Vercel)

`vercel.json` — SPA uchun barcha yo'llarni `index.html` ga qayta
yozadi, LEKIN kengaytmasi bor fayllarni (`.txt`, `.xml`, `.png`,
`.woff2`, `.js`, `.css` …) tegmay qoldiradi.

⚠ Eski qoida `robots.txt` va `sitemap.xml` ni ISTISNO QILMAGAN edi
(ular S-037 da qo'shilgan) va endi mavjud bo'lmagan `models/`,
`favicon.svg` ni sanardi. Yangi qoida kengaytma bo'yicha ishlaydi,
ya'ni keyin qo'shiladigan statik fayl ham o'zi to'g'ri ishlaydi.

Build `sitemap.xml` ni o'zi yasaydi. Vercel'da build paytida
backendga yetib bo'lmasa, sitemap faqat statik sahifalar bilan
yoziladi — build yiqilmaydi.

## SEO

Har bir sahifa o'z `<title>`, `description` va Open Graph teglarini
`src/components/ui/Seo.jsx` orqali beradi — kutubxona ishlatilmaydi,
React 19 bu teglarni komponentdan `<head>` ga o'zi ko'chiradi.
`index.html` da statik `<title>` ATAYLAB yo'q (ikkilanmasligi uchun).

`sitemap.xml` build paytida yasaladi (`pnpm sitemap` alohida ham
ishlaydi). Mahsulot manzillari API'dan olinadi; API yetib bo'lmasa
skript yiqilmaydi — faqat statik sahifalarni yozadi va ogohlantiradi.

Manzil `.env` dagi `VITE_SITE_URL` dan olinadi.

### Google Search Console

1. https://search.google.com/search-console → "Add property" → domen
   yoki URL prefiksi (`https://vodiykafel.uz`).
2. Tasdiqlash: DNS TXT yozuvi (domen uchun) yoki `public/` ga
   qo'yiladigan HTML fayl.
3. "Sitemaps" bo'limiga `sitemap.xml` qo'shiladi.
4. ⚠ Sayt — SPA. Robot xom HTML'da kontentni ko'rmaydi; buning
   yechimi S-038 (prerender) da hal qilinadi. Shu bajarilmaguncha
   indekslash to'liq bo'lmasligi mumkin.

## Checks

```sh
pnpm lint        # oxlint
pnpm test        # vitest (jsdom) — 67 ta test
pnpm build       # sitemap + vite build + byudjet tekshiruvi
```

### Testlar

Vitest + jsdom. `pnpm test:watch` — kuzatuv rejimi.

⚠ jsdom brauzer EMAS: joylashuv, rang, GSAP animatsiyasi, scroll va
haqiqiy fokus bu yerda sinalmaydi. Ular uchun brauzer kerak.

### Tezlik byudjeti

`pnpm build` oxirida `scripts/check-budget.mjs` ishlaydi:

| Nima                       | Byudjet  |
| -------------------------- | -------- |
| Birinchi ekran JS (gzip)   | 150 KB   |
| Bitta rasm                 | 200 KB   |

Byudjet buzilsa OGOHLANTIRADI, lekin build'ni to'xtatmaydi.
CI uchun: `node scripts/check-budget.mjs --strict`.

Lighthouse o'lchovi:

```sh
pnpm build && pnpm preview   # 1-terminal
pnpm lighthouse              # 2-terminal → lighthouse.html
```

⚠ Bitta yurish ISHONCHSIZ (ball 80–86 orasida sakraydi). Xulosa
chiqarishdan oldin 3 marta yurgizib mediana oling.

### Ijtimoiy tarmoq kartochkasi

`pnpm og` — `public/images/og-card.png` (1200×630) va `logo-512.png`
ni qayta yasaydi. Manba `scripts/assets/logo-source.png` (1.45 MB,
ataylab `public/` dan tashqarida — u deploy qilinmasligi kerak).

## Content and assets

- `src/data/`: local concept catalogue and business information.
- `public/images/materials/`: optimized material and interior reference images.
- `public/models/ceramic-vase.glb`: CC0 ceramic model.
- `public/fonts/`: locally hosted Manrope and its OFL license.
- `src/lib/sound.js`: opt-in Web Audio.
- `ASSETS.md`: exact sources, attribution and reference-photo rights status.
- `DESIGN.md`: current visual direction.

Everything remains frontend-only. The contact form is a local demonstration.
Production hosting must rewrite application routes to index.html. Review the manufacturer-reference image rights in ASSETS.md before public commercial deployment.
