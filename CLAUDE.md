# Vodiy Kafel — Backend

Kafel/keramogranit savdo platformasining backend qismi.
To'liq TZ: Notion — "Vodiy Kafel — Sayt va Platforma TZ (v1.1)".
Task ro'yxati: `task.txt` (58 task, 12 epic).

## Doira

- **FAQAT BACKEND.** Frontend alohida jamoa tomonidan yoziladi.
- Frontend uchun yagona shartnoma — Swagger (`/api/docs`).
- `kafel-web.vercel.app` — eski test loyiha, **e'tiborga olinmaydi**.

## Stack

- NestJS 11 + TypeScript
- Prisma 7 + PostgreSQL — **local, Docker ISHLATILMAYDI** (mijoz talabi)
- pnpm
- JWT auth (stateless — kelajakdagi mobil ilova uchun ham)

⚠ Prisma 7 o'ziga xosligi: ulanish manzili `schema.prisma` da EMAS —
CLI uchun `prisma.config.ts` da, ishlash vaqtida esa `PrismaService`
ichidagi `PrismaPg` adapteri orqali beriladi.

## Ish tartibi

`task.txt` dagi tasklar **ketma-ket, bittadan** bajariladi.
Bir vaqtda bir nechta task boshlanmaydi.

Tartib raqam bo'yicha emas, **bog'liqlik bo'yicha**: agar taskning
"Bog'liq" maydonidagi task hali tugamagan bo'lsa, avval o'sha bajariladi
(masalan B-006 → B-009 ga bog'liq, shuning uchun B-009 oldin qilingan).

Task tugagach:
1. `pnpm build` + `pnpm lint` + `pnpm test` o'tishi shart
2. Yangi endpointlar Swagger'da ko'rinishi shart
3. `task.txt` da holat `[ ]` → `[x]` ga o'zgartiriladi
4. Pastdagi "UMUMIY HOLAT" va "KEYINGI TASK" yangilanadi

## Buzilmas qoidalar

### 1. Narx faqat backenddan
Frontend yuborgan summa/narx **hech qachon** ishonchli emas.
Buyurtma yaratishda narx bazadan olinadi va qayta hisoblanadi.
Frontend faqat `productId` va `pallets` yuboradi.

### 2. Zaxira aniq soni — sir
Public API javoblarida `stockPallets` ham, **narx ham** hech qachon bo'lmaydi.
Narx filialga va mijozga bog'liq (11-qoida), faqat kirgan optom mijozga ko'rinadi.

Zaxira uch darajada ko'rinadi (TZ 3.2, 3.7.1) — **ular bir xil emas**:

| Kim | Nima ko'radi |
|---|---|
| Mehmon / chakana (ochiq katalog) | `AVAILABLE` / `UNAVAILABLE` — **ikki holat** |
| Optom mijoz kabineti, admin panel | `IN_STOCK` / `LOW` / `OUT_OF_STOCK` — 🟢🟡🔴 |
| Admin (`/admin/*`) | Aniq son |

→ Har bir entity uchun ikki xil DTO: `PublicDto` va `AdminDto`.

### 3. Tashqi xizmatlar — interfeys ortida
To'lov, SMS, Telegram, Didox.uz, fayl saqlash — hammasi interfeys + mock.
Biznes-servis konkret provayder nomini **bilmaydi**.
Haqiqiysi ulanganda faqat yangi klass yoziladi, eski kod o'zgarmaydi.

To'lov hozircha `MockPaymentProvider`. Onlayn usullar — Payme va Click;
haqiqiy Payme integratsiyasi eng oxirgi task (B-050). Kodda "Payme" yoki
"Click" so'zi B-050 gacha **hech qayerda** uchramaydi.

Shartnoma avtomatlashtirish — **Didox.uz** (eski TZ'dagi "Dedoc" xato edi).
INN asosida ishlaydi, E-IMZO bilan integratsiyalashgan. Spike — B-044.

### 4. Kim auth qiladi — kim yo'q

**Chakana (oddiy) mijoz:** hisob YO'Q. U saytni faqat ko'radi.
Ro'yxatdan o'tish, kirish, savatcha, buyurtma formasi, shaxsiy kabinet —
hech biri yo'q. Katalog endpointlari ochiq, token talab qilmaydi.

**Optom (B2B) mijoz:** login + parolni **admin/menejer beradi**.
Self-registration yo'q. Birinchi kirishda parol almashtiriladi.
Buyurtma, kabinet, balans, bildirishnoma — faqat shu toifa uchun.

**Xodimlar** — o'z login/paroli bilan. Rollar ierarxiyasi:

| Rol | branchId | Doira |
|---|---|---|
| `SUPER_ADMIN` | `null` | Hammasi, moderatorlarni ham boshqaradi |
| `MODERATOR` | CENTRAL filial | Markaziy ombor: filial va agent buyurtmalari |
| `BRANCH_ADMIN` | RETAIL filial | Faqat o'z filiali |
| `MANAGER` | RETAIL filial | Faqat o'z filiali |

Telefon yoki Telegram orqali kelgan buyurtmani menejer admin panelidan
qo'lda kiritadi — mehmon checkout yo'q.

> ⚠ Bu TZ 3.5 ga ZID (TZ chakana mijoz ro'yxatdan o'tadi deydi).
> Mijozning 2026-09-08 dagi og'zaki talabi ustun.

### 5. Filial izolyatsiyasi (multi-tenancy)

Baza **bitta** (umumiy PostgreSQL), ajratish `branchId` ustuni orqali.

**Filial turlari teng emas** (TZ 3.7.2):

- **`CENTRAL`** (1–2 dona) — haqiqiy **zaxira shu yerda**. Xodimi `MODERATOR`.
- **`RETAIL`** (Farg'ona, Andijon, Namangan, Qo'qon) — faqat **narx** saqlaydi,
  o'z zaxirasi YO'Q (bu kelajakdagi funksiya — TZ 8.2). O'zida yo'q mahsulotni markaziy ombordan
  buyurtma qiladi — xuddi mijoz kabi, **o'sha `Order` mexanizmi orqali**
  (`orderingType: BRANCH`, B-058). Filiallar bir-biridan buyurtma qilmaydi.

Har bir filialning **o'z narxi** bor: bir xil mahsulot Farg'onada va
Andijonda turli summa beradi.

- **Narx** `Product` da emas, **`BranchProduct`** da (branchId + productId)
- **Zaxira** esa umuman filialga bog'lanmaydi — u `ProductStock` da,
  mahsulotga **bitta umumiy son** (TZ 3.7.1: "Zaxira bu jadvalda yo'q").
  `ProductStock` da `branchId` ustuni **yo'q** — shuning uchun RETAIL
  filialga zaxira yozib qo'yish tuzilma darajasida imkonsiz.
  Filial admini zaxirani **ko'radi, lekin boshqarmaydi** — uni faqat
  MODERATOR/SUPER_ADMIN o'zgartiradi
- `BRANCH_ADMIN` / `MANAGER` faqat **o'z filialini** ko'radi — narx,
  mijoz, buyurtma, balans. Boshqa filialniki → **404**
  (403 emas — mavjudligini oshkor qilmaslik uchun)
- `MODERATOR` — faqat o'z CENTRAL filiali
- `SUPER_ADMIN` hammasini ko'radi (`branchId = null`)
- Optom mijozning `branchId` si majburiy — u o'z filialining narxini ko'radi
  va buyurtmani o'sha filialga beradi
- Filial **hech qachon** body/query dan olinmaydi — har doim tokendan.
  Aks holda mijoz boshqa filialning narxini so'rab oladi

Buni har bir servisda qo'lda yozish mumkin emas — `BranchScopeService`
orqali markazlashgan (B-051). Har bir Prisma so'roviga `branchId` filtri
majburiy.

> ⚠ Yetkazib berish tarifi **umumiy EMAS** (eski qaror bekor qilindi).
> U `filial × viloyat × transport turi` matritsasi — `BranchRegionTariff`
> (B-053). Transport turlari ham hardcode emas, jadvalda (`TransportType`).

### 6. IDOR himoyasi
Har bir `/me/*` endpointda egalik tekshiriladi (`resource.customerId === token.sub`).
Begona resurs → **404** qaytariladi (403 emas — mavjudligini oshkor qilmaslik uchun).

### 7. Pul va vaqt
- Pul: so'mda, `Decimal`/`BigInt`. **Float ishlatilmaydi.**
- Vaqt: bazada UTC. Formatlash — frontend zimmasida.
- ⚠ Bu qoida **pulga** taalluqli. Koordinata (lat/lng) `Float` —
  o'nlik arifmetika muammosi yo'q va frontendga satr emas, son bo'lib boradi.

### 8. Narx snapshot
`OrderItem` da narx nusxasi saqlanadi. Mahsulot narxi keyin o'zgarsa,
eski buyurtma summasi o'zgarmasligi kerak.

### 9. Balans — hisoblanadi, yozilmaydi
`balance` hech qachon to'g'ridan-to'g'ri yozilmaydi.
Har o'zgarish = yangi `AccountTransaction` yozuvi (audit trail).
Tranzaksiya o'chirilmaydi — faqat teskari `ADJUSTMENT` qo'shiladi.

### 10. Bildirishnoma — kanal-agnostik
Biznes-servis event chiqaradi, kanallarni bilmaydi.
Yangi kanal (push, SMS) qo'shish = yangi klass, eski kodga tegilmaydi.

### 11. Individual mijoz narxi (TZ 3.3.1)

Bir xil mahsulot **turli B2B mijozga turli narxda** sotiladi — masalan
Navoiydagi ikki mijozga 10 000 va 8 000 so'mdan.

Narx zanjiri — **eng aniq qoida yutadi**:

```
mijoz + aynan shu mahsulot   (eng kuchli)
mijoz + zavod/kategoriya
mijoz + umumiy chegirma
filial bazaviy narxi          (eng zaif)
```

- Qoidalar `PricingRule` da (B-052): `domain: PRODUCT | TRANSPORT`,
  `type: FIXED | PERCENT`
- Zanjirni hisoblovchi **bitta** joy — `PricingResolverService` (B-054).
  Mahsulot narxi ham, transport narxi ham **shu bitta funksiyadan** o'tadi
- `SUPER_ADMIN` cheklovsiz; `BRANCH_ADMIN` faqat `PERCENT` va faqat
  `pricing.branchAdminMaxDiscountPercent` sozlamasidagi chegaragacha
- Mijoz **yakuniy narxni** ko'radi; chegirmaning **sababi** (qaysi qoida
  ishladi) hech qachon javobga chiqmaydi. Boshqa mijozning narxi — ko'rinmaydi
- Kalkulyator mijozga **ochiq** ko'rsatiladi — yashiriladigani narx sababi

### 12. Invariantlar bazada ham qulflanadi

Muhim biznes-invariant faqat dasturga ishonib qo'yilmaydi — seed,
migratsiya yoki qo'lda SQL ham buzolmasligi kerak.

Misol (`users_and_roles` migratsiyasi):
```sql
CHECK (role = 'SUPER_ADMIN' AND branch_id IS NULL
    OR role <> 'SUPER_ADMIN' AND branch_id IS NOT NULL)
```
"Filialsiz BRANCH_ADMIN" paydo bo'lsa, `BranchScopeService` filtri hech
narsani cheklamaydi — shuning uchun bu baza darajasida qulflangan.

Prisma sxemasi ifodalay olmaydigan cheklov qo'shish:
`prisma migrate dev --create-only` → SQL'ni qo'lda yozish → `pnpm db:migrate`.

Jadvallararo qoidalar (masalan `MODERATOR` → filial `CENTRAL` bo'lishi)
CHECK bilan ifodalanmaydi — ular dastur darajasida (B-057).

## Kod konventsiyalari

### Modul tuzilishi
```
src/modules/<nom>/
  <nom>.module.ts
  <nom>.controller.ts        # public
  <nom>.admin.controller.ts  # admin (agar kerak bo'lsa)
  <nom>.service.ts
  dto/
    create-<nom>.dto.ts
    update-<nom>.dto.ts
    <nom>-public.response.dto.ts
    <nom>-admin.response.dto.ts
```

### Qoidalar
- Barcha endpointlar `/api/v1` prefiksi bilan (global prefix)
- Har bir endpointda `@ApiOperation` + `@ApiResponse`.
  Muvaffaqiyatli javob uchun — `@ApiDataResponse(Dto)`, chunki oddiy
  `@ApiOkResponse` `{ data: ... }` o'ramini ko'rsatmaydi va frontendga
  **yolg'on kontrakt** beradi
- Barcha DTO'larda `class-validator` dekoratorlari
- Controller ichida biznes-mantiq **yozilmaydi** — faqat service chaqiriladi
- Prisma raw query ishlatilmaydi (kerak bo'lsa — parametrli)
- Ko'p yozuvli operatsiyalar `$transaction` ichida
- Prisma turlari FAQAT `src/prisma/prisma-client.ts` orqali import qilinadi

### Enum'lar
Barchasi `src/common/enums/` orqali import qilinadi — boshqa yo'l yo'q.
Lekin **ta'rif joyi ikki xil**:

- **Bazada bor** enum (`UserRole`, `BranchType`, `OrderStatus` …) —
  manba `prisma/schema.prisma`, `common/enums/` faqat **re-export** qiladi.
  Ikki marta yozilsa — drift (sxema o'zgaradi, TS enum eskicha qoladi)
- **Bazada yo'q** enum (`StockStatus` — hisoblanadi, `SortOrder` —
  sahifalash) — qo'lda yoziladi

### Nomlash
- Fayl: `kebab-case.ts`
- Klass: `PascalCase`
- Prisma model: `PascalCase` (singular) — `Product`, `OrderItem`
- Prisma enum: `PascalCase`, `@@map` bilan `snake_case` — `user_role`
- Endpoint: `kebab-case` — `/unread-count`
- DB ustun: Prisma `camelCase`, `@map` bilan `snake_case`
- DB jadval: `@@map` bilan ko'plik `snake_case` — `branches`, `users`

## Muhit

```bash
pnpm start:dev      # ishga tushirish
pnpm build          # kompilyatsiya
pnpm lint           # eslint --fix
pnpm test           # jest
pnpm db:migrate     # migratsiya yaratish + qo'llash
pnpm db:generate    # Prisma klientini qayta generatsiya qilish
pnpm openapi:export # openapi.json yangilash
pnpm db:seed        # test ma'lumotlari (bazani TOZALAB qayta to'ldiradi)
```

Seed hisoblari: parol `Parol123!` — SUPER_ADMIN `+998900000001`,
MODERATOR `+998900000002`, optom mijoz `fargona-optom`.

⚠ `pnpm db:seed` bazani to'liq tozalaydi va `NODE_ENV=production` da
ishga tushmaydi. `account_transactions` da audit trigger bo'lgani uchun
tozalash `TRUNCATE ... CASCADE` orqali (oddiy DELETE ishlamaydi).

`/dev/*` endpointlar (mock to'lovni simulyatsiya qilish) faqat
`NODE_ENV=development` da ro'yxatdan o'tadi.

## Ochiq savollar

TZ'da mijozdan javob kutilayotgan **11 ta savol** bor (`task.txt` oxirida),
shundan 9 tasi hali ochiq.
Har biri uchun vaqtinchalik qaror qabul qilingan va **interfeys ortiga yashirilgan** —
javob kelganda faqat bitta joy tahrirlanadi. Ish to'xtamaydi.
