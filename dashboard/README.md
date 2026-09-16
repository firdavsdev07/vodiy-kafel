# Vodiy Kafel — Dashboard (admin panel)

Xodimlar uchun boshqaruv paneli: SUPER_ADMIN, MODERATOR, BRANCH_ADMIN, MANAGER.
Backend — `../api` (NestJS). Task ro'yxati — [`task.txt`](task.txt).

## Stack

React 19 · Vite · **TypeScript (strict)** · (keyingi tasklarda) Tailwind v4,
react-router v7, TanStack Query.

⚠ Node ≥ 24 tavsiya etiladi (backend bilan bir xil).

## Ishga tushirish

```bash
pnpm install
cp .env.example .env      # VITE_API_URL — backend manzili
pnpm dev                  # http://localhost:5174
```

Backend alohida: `cd ../api && pnpm start:dev` (http://localhost:3000).

## Buyruqlar

```bash
pnpm dev         # dev server
pnpm build       # type-check (tsc -b) + production build
pnpm typecheck   # faqat type-check
pnpm lint        # oxlint
pnpm test        # vitest
pnpm api:types   # ../api/openapi.json → src/shared/api/schema.d.ts
```

### API turlari

`src/shared/api/schema.d.ts` — **generatsiya qilinadi, qo‘lda tahrirlanmaydi**, git'ga kiradi.
Backend o‘zgarsa: `cd ../api && pnpm openapi:export`, keyin shu yerda `pnpm api:types`.
Generator TypeScript 5 talab qiladi (loyiha TS 7 da), shuning uchun skript uni `pnpm dlx` orqali
alohida TS 5 bilan ishga tushiradi.

```ts
import { api, ApiError } from '@/shared/api';
const page = await api.get('/admin/products', { query: { page: 1 } }); // { data } ochilgan
const order = await api.get('/admin/orders/{id}', { params: { id } });
```

## Tuzilma

```
src/
  app/            router, provayderlar, global layout
  pages/<domen>/  sahifalar
  features/<domen>/ domenga xos hook va komponentlar
  shared/ui/      umumiy komponentlar
  shared/api/     API qatlami
  shared/lib/     util (format, enum lug'ati, sana)
  shared/config/  muhit sozlamalari (`env`)
```

Import — `@/` alias bilan: `import { env } from '@/shared/config/env'`.

⚠ `VITE_` bilan boshlangan o'zgaruvchilar brauzerga chiqadi — `.env` ga maxfiy
kalit yozilmaydi.
