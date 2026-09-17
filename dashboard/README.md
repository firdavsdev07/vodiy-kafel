# Vodiy Kafel — Dashboard (admin panel)

Xodimlar uchun boshqaruv paneli: `SUPER_ADMIN`, `MODERATOR`, `BRANCH_ADMIN`, `MANAGER`.
Backend — [`../api`](../api) (NestJS). Task ro'yxati va qarorlar — [`task.txt`](task.txt).

Optom mijoz kabineti va chakana katalog bu paketda **yo'q** (task.txt ❓ 1, `../storefront`).

## Stack

React 19 · Vite 8 · TypeScript (strict) · Tailwind v4 · React Router 7 · TanStack Query 5 ·
react-hook-form + zod · Vitest + Testing Library + MSW · Playwright.

⚠ Node ≥ 24 tavsiya etiladi (backend bilan bir xil; backend Jest'i undan pastda ishlamaydi).

## Mahalliy ishga tushirish

Tartib: **baza → backend → dashboard**.

```bash
# 1. PostgreSQL (masalan Docker)
docker run -d --name vk-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=vodiy-kafel -p 5432:5432 postgres:16

# 2. Backend (../api)
cd ../api
pnpm install
cp .env.example .env          # DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
pnpm db:deploy                 # migratsiyalar
pnpm db:seed                   # ⚠ bazani TOZALAB test ma'lumotlarini yozadi
pnpm start:dev                 # http://localhost:3000/api/v1, Swagger: /api/docs

# 3. Dashboard (shu papka)
cd ../dashboard
pnpm install
cp .env.example .env           # VITE_API_URL
pnpm dev                       # http://localhost:5174
```

### Seed hisoblari

Barchasida parol **`Parol123!`** (to'liq ro'yxat — [`../api/README.md`](../api/README.md)).

| Rol | Telefon (login) |
| --- | --- |
| `SUPER_ADMIN` | `+998 90 000 00 01` |
| `MODERATOR` (markaziy ombor) | `+998 90 000 00 02` |
| `BRANCH_ADMIN` — Farg'ona | `+998 90 011 00 01` |
| `MANAGER` — Farg'ona | `+998 90 022 00 01` |

## Muhit o'zgaruvchilari

| O'zgaruvchi | Majburiy | Misol | Izoh |
| --- | --- | --- | --- |
| `VITE_API_URL` | ha | `https://api.vodiykafel.uz/api/v1` | Backend bazasi, `/api/v1` bilan. Noto'g'ri yoki yo'q bo'lsa ilova ochilishda aniq xato beradi (`src/shared/config/env.ts`) |

⚠ `VITE_` bilan boshlangan **har qanday** o'zgaruvchi build'ga yoziladi va brauzerda ko'rinadi —
bu yerga maxfiy kalit (token, parol, secret) **yozilmaydi**. Qiymat build paytida o'rnatiladi:
o'zgartirilsa — qayta build.

## Buyruqlar

```bash
pnpm dev         # dev server (5174)
pnpm build       # tip tekshiruvi (tsc -b: ilova, unit/komponent testlar, e2e) + production build
pnpm size        # build'dan keyin: bundle hajmi chegaralarini tekshiradi (gzip)
pnpm typecheck   # faqat tip tekshiruvi
pnpm lint        # oxlint
pnpm test        # vitest — unit (node) va komponent (jsdom + MSW) testlar
pnpm e2e         # Playwright — haqiqiy backendga qarshi (pastga qarang)
pnpm api:types   # ../api/openapi.json → src/shared/api/schema.d.ts
```

### API turlari

`src/shared/api/schema.d.ts` — **generatsiya qilinadi, qo'lda tahrirlanmaydi**, git'ga kiradi.
Backend o'zgarsa: `cd ../api && pnpm openapi:export`, keyin shu yerda `pnpm api:types` —
TypeScript buzilgan joylarni o'zi ko'rsatadi. Generator TypeScript 5 talab qiladi (loyiha TS 7 da),
skript uni `pnpm dlx` orqali alohida ishga tushiradi.

```ts
import { api, ApiError } from '@/shared/api';
const page = await api.get('/admin/products', { query: { page: 1 } }); // { data } ochilgan
const order = await api.get('/admin/orders/{id}', { params: { id } });
```

### Testlar

- **Unit** — `src/**/*.test.ts`, node muhitida (formatlash, forma sxemalari, ruxsatlar, API klient,
  401 → refresh, lug'at ↔ `openapi.json`).
- **Komponent** — fayl boshida `// @vitest-environment jsdom`, `src/test/setup-component.tsx` va
  `src/test/msw.ts`. MSW javoblari `schema.d.ts` turlari bilan: mock shartnomadan chetlashsa build yiqiladi.
- **E2E** — `e2e/`, Playwright. Alohida **`vodiy-kafel-test`** bazasida; dev bazaga tegmaydi.
  `pnpm e2e` o'zi: test bazasini migratsiya + seed qiladi, API ni 3001-portda va dashboard'ni
  5175-portda ko'taradi. Bir martalik tayyorgarlik:

  ```bash
  docker exec vk-postgres createdb -U postgres vodiy-kafel-test
  pnpm exec playwright install chromium
  ```

  ⚠ Backend auth'ni daqiqasiga 10 so'rov bilan cheklaydi — testlar ketma-ket va ~2 daqiqa davom etadi.

## Production build va deploy

- **Build**: `pnpm build` → `dist/`. Har sahifa alohida chunk (route-level lazy loading);
  `pnpm size` chegaralari: kirish chunk ≤ 130 KB, boshqa chunk ≤ 60 KB, JS jami ≤ 400 KB (gzip).
  Hozirgi holat: kirish ~87 KB, jami ~283 KB.
- **Vercel**: [`vercel.json`](vercel.json) — SPA uchun barcha yo'llar `index.html` ga
  (`/assets`, `/fonts`, `favicon.svg` dan tashqari), `/assets` uchun uzoq kesh, xavfsizlik
  sarlavhalari. Loyiha sozlamasida Root Directory — `dashboard`, muhitda `VITE_API_URL`.
- **CORS (backend tomonida!)**: API dashboard domenidan kelgan so'rovlarni qabul qilishi uchun
  `../api/.env` dagi **`CORS_ORIGINS`** ga dashboard domeni qo'shiladi
  (vergul bilan: `https://admin.vodiykafel.uz,https://vodiykafel.uz`). Production'da `*` qoldirilmaydi.

## Tuzilma

```
src/
  app/              router, provayderlar, layout (yon menyu, yuqori panel)
  pages/<domen>/    sahifalar (marshrut darajasida lazy)
  features/<domen>/ domen hook'lari, forma mantig'i (+ testlari), domen komponentlari
  shared/ui/        umumiy komponentlar (DataTable, Modal, forma maydonlari…)
  shared/api/       API klient va generatsiya qilingan turlar
  shared/lib/       format, lug'at (labels.ts), ruxsatlar, util
  shared/config/    muhit sozlamalari (`env`)
  test/             komponent testlari uchun MSW va render yordamchilari
e2e/                Playwright ssenariylari
scripts/            build yordamchilari (bundle hajmi)
```

Import — `@/` alias bilan: `import { env } from '@/shared/config/env'`.
