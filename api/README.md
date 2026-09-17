# Vodiy Kafel — Backend

Kafel/keramogranit savdo platformasining backend qismi. NestJS 11 +
Prisma 7 + PostgreSQL. Frontend uchun yagona shartnoma — Swagger
(`/api/docs`) va `openapi.json`.

Loyiha qoidalari va konventsiyalari — [CLAUDE.md](CLAUDE.md). Task
ro'yxati va joriy holat — [task.txt](task.txt).

## Ishga tushirish

Kerak: **Node ≥ 24.9** (`@nestjs/config`/`@nestjs/jwt` ESM-only,
eski Node'da testlar ishlamaydi), local PostgreSQL 16 (docker
ishlatilmaydi).

```bash
pnpm install
cp .env.example .env        # DATABASE_URL, JWT_SECRET va h.k. ni to'ldiring
pnpm db:migrate              # sxemani bazaga qo'llaydi
pnpm db:seed                 # test ma'lumotlari (pastga qarang)
pnpm start:dev                # http://localhost:3000/api/v1
```

Swagger: `http://localhost:3000/api/docs` (`SWAGGER_ENABLED=true` bo'lsa).

## Test hisoblar (`pnpm db:seed` dan keyin)

⚠ `pnpm db:seed` bazani TO'LIQ TOZALAB qayta to'ldiradi va
`NODE_ENV=production` da ishlamaydi. Barcha hisoblarda parol: **`Parol123!`**

| Turi                | Login / telefon      | Rol / kompaniya                     |
| -------------------- | --------------------- | ------------------------------------- |
| Xodim (telefon bilan) | `+998900000001`       | `SUPER_ADMIN`                         |
| Xodim                 | `+998900000002`       | `MODERATOR` (markaziy ombor)          |
| Xodim                 | `+998900110001`        | `BRANCH_ADMIN` — Farg'ona             |
| Xodim                 | `+998900220001`        | `MANAGER` — Farg'ona                  |
| Optom mijoz (login bilan) | `fargona-optom`   | Farg'ona Qurilish MChJ                |
| Optom mijoz           | `andijon-optom`       | Andijon Qurilish MChJ                 |
| Optom mijoz           | `namangan-optom`      | Namangan Qurilish MChJ                |
| Optom mijoz           | `qoqon-optom`         | Qo'qon Qurilish MChJ                  |
| Optom mijoz (markaz agenti) | `navoiy-agent`  | Navoiy Agent MChJ                     |

Xodim `POST /auth/admin/login` bilan (`phone` + `password`), optom mijoz
`POST /auth/wholesale/login` bilan (`login` + `password`) kiradi.
Har bir viloyat uchun aniq telefon raqamlar seed ishga tushganda
terminalga chiqadi (`pnpm db:seed` chiqishiga qarang).

⚠ Barcha optom mijozlarda `mustChangePassword: true` — birinchi
kirishdan keyin `POST /auth/wholesale/change-password` chaqirilishi
SHART, aks holda boshqa hech qaysi endpoint ishlamaydi (`403`).
Chakana (oddiy) mijozda umuman hisob yo'q — katalog token talab qilmaydi.

## Testlar

```bash
pnpm test          # unit — 42 fayl, ~611 test, mock'lar bilan (baza kerak emas)
pnpm test:e2e      # e2e — real HTTP + real Postgres (pastga qarang)
pnpm test:cov      # coverage
```

`pnpm test:e2e` **alohida** `vodiy-kafel-test` bazasida ishlaydi — dev
bazangizga (`.env`) tegmaydi. Muhit `.env.test` da (`test/setup-env.ts`
uni yuklaydi), har ishga tushishda migratsiya + seed avtomatik bajariladi
(`test/global-setup.ts`) — qo'lda tayyorlov shart emas, faqat Postgres
ishlab turishi kerak:

```bash
createdb vodiy-kafel-test   # bir martalik, agar hali yo'q bo'lsa
pnpm test:e2e
```

Ssenariylar — `test/critical-flows.e2e-spec.ts`: ochiq katalog, optom
mijoz onboarding, filial narx izolyatsiyasi, kalkulyator→buyurtma (soxta
narx e'tiborsiz qoldirilishi), mock to'lov→balans→bildirishnoma, admin
holat o'zgartirishi→mijoz pollingda ko'rishi, IDOR himoyasi (404), auth
guard (401), filial admin faqat o'z narxini o'zgartirishi.

## Frontend uchun hujjat paketi (B-048)

| Fayl                                    | Nima uchun                                                    |
| ---------------------------------------- | ---------------------------------------------------------------|
| [`openapi.json`](openapi.json)           | To'liq, avtomatik generatsiya qilingan shartnoma — 92 yo'l. `pnpm openapi:export` bilan yangilanadi. Postman/Thunder Client/Insomnia'ga to'g'ridan-to'g'ri import qilinadi. |
| [`docs/vodiy-kafel.postman_collection.json`](docs/vodiy-kafel.postman_collection.json) | Asosiy oqimlar bo'yicha tayyor Postman kolleksiyasi — login qilingach token o'zi saqlanadi, qo'lda ko'chirish shart emas. |
| [`docs/enums.md`](docs/enums.md)         | Barcha enum qiymatlari + o'zbekcha ko'rinishi (status nomlarini ekranda qanday chiqarish kerak). |
| [`docs/error-codes.md`](docs/error-codes.md) | Xato javobining formati va har bir HTTP status qachon chiqishi. |
| [`docs/adr/`](docs/adr)                  | Muhim arxitektura qarorlari (masalan filial→markaziy ombor ta'minot buyurtmasi). |
| `/api/docs` (Swagger)                    | Jonli, interaktiv hujjat — har bir endpointni shu yerdan "Try it out" bilan sinab ko'rish mumkin. |

## Muhim texnik eslatmalar

- Barcha endpointlar `/api/v1/...` ostida.
- Muvaffaqiyatli javob har doim `{ "data": ... }` (ba'zan `meta` bilan);
  xato — `docs/error-codes.md` dagi bitta format.
- Pul — satr ko'rinishida (`"85000.00"`), **hech qachon** `float` emas —
  to'g'ridan-to'g'ri arifmetikaga ishlatmang, ekranga chiqarishdan oldin
  formatlang.
- Ochiq katalogda narx ham, aniq zaxira soni ham YO'Q — faqat login
  qilgan optom mijoz ko'radi (o'z filialining narxi, o'z chegirmasi bilan).
- `/dev/payments/:id/simulate` faqat `NODE_ENV=development` da mavjud —
  mock to'lov oqimini frontend tomonidan qo'lsiz sinash uchun.
