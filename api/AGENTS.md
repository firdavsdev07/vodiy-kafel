# Vodiy Kafel — Backend

Kafel/keramogranit savdo platformasining backend qismi.
To'liq TZ: Notion — "Vodiy Kafel — Sayt va Platforma TZ (v1.1)".
Task ro'yxati: `task.txt` (50 task, 12 epic).

## Doira

- **FAQAT BACKEND.** Frontend alohida jamoa tomonidan yoziladi.
- Frontend uchun yagona shartnoma — Swagger (`/api/docs`).
- `kafel-web.vercel.app` — eski test loyiha, **e'tiborga olinmaydi**.

## Stack

- NestJS 11 + TypeScript
- Prisma + PostgreSQL (hozircha local, docker-compose orqali)
- pnpm
- JWT auth (stateless — kelajakdagi mobil ilova uchun ham)

## Ish tartibi

`task.txt` dagi tasklar **ketma-ket, bittadan** bajariladi.
Bir vaqtda bir nechta task boshlanmaydi.

Task tugagach:
1. `pnpm build` o'tishi shart
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
Narx filialga bog'liq va faqat kirgan optom mijozga ko'rinadi.
Faqat `stockStatus: IN_STOCK | LOW | OUT_OF_STOCK`.
Aniq son faqat `/admin/*` endpointlarida.
→ Har bir entity uchun ikki xil DTO: `PublicDto` va `AdminDto`.

### 3. Tashqi xizmatlar — interfeys ortida
To'lov, SMS, Telegram, Dedoc, fayl saqlash — hammasi interfeys + mock.
Biznes-servis konkret provayder nomini **bilmaydi**.
Haqiqiysi ulanganda faqat yangi klass yoziladi, eski kod o'zgarmaydi.

To'lov hozircha `MockPaymentProvider`. Haqiqiy Payme — eng oxirgi task (B-050).

### 4. Kim auth qiladi — kim yo'q

**Chakana (oddiy) mijoz:** hisob YO'Q. U saytni faqat ko'radi.
Ro'yxatdan o'tish, kirish, savatcha, buyurtma formasi, shaxsiy kabinet —
hech biri yo'q. Katalog endpointlari ochiq, token talab qilmaydi.

**Optom (B2B) mijoz:** login + parolni **admin/menejer beradi**.
Self-registration yo'q. Birinchi kirishda parol almashtiriladi.
Buyurtma, kabinet, balans, bildirishnoma — faqat shu toifa uchun.

**Admin / menejer:** o'z login/paroli bilan.

Telefon yoki Telegram orqali kelgan buyurtmani menejer admin panelidan
qo'lda kiritadi — mehmon checkout yo'q.

> ⚠ Bu TZ 3.5 ga ZID (TZ chakana mijoz ro'yxatdan o'tadi deydi).
> Mijozning 2026-09-08 dagi og'zaki talabi ustun.

### 5. Filial izolyatsiyasi (multi-tenancy)

Har bir filialning **o'z narxi va o'z zaxirasi** bor. Bir xil mahsulot
Farg'onada va Andijonda turli summa beradi.

- Narx/zaxira `Product` da emas, **`BranchProduct`** da (branchId + productId)
- `BRANCH_ADMIN` / `MANAGER` faqat **o'z filialini** ko'radi — narx, zaxira,
  mijoz, buyurtma, balans. Boshqa filialniki → **404**
- `SUPER_ADMIN` hammasini ko'radi (`branchId = null`)
- Optom mijozning `branchId` si majburiy — u o'z filialining narxini ko'radi
  va buyurtmani o'sha filialga beradi
- Filial **hech qachon** body/query dan olinmaydi — har doim tokendan.
  Aks holda mijoz boshqa filialning narxini so'rab oladi
- Yetkazib berish tarifi (fura/vagon) — **umumiy**, filialga bog'liq emas

Buni har bir servisda qo'lda yozish mumkin emas — `BranchScopeService`
orqali markazlashgan (B-051). Har bir Prisma so'roviga `branchId` filtri
majburiy.

### 6. IDOR himoyasi
Har bir `/me/*` endpointda egalik tekshiriladi (`resource.customerId === token.sub`).
Begona resurs → **404** qaytariladi (403 emas — mavjudligini oshkor qilmaslik uchun).

### 7. Pul va vaqt
- Pul: so'mda, `Decimal`/`BigInt`. **Float ishlatilmaydi.**
- Vaqt: bazada UTC. Formatlash — frontend zimmasida.

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
- Har bir endpointda `@ApiOperation` + `@ApiResponse`
- Barcha DTO'larda `class-validator` dekoratorlari
- Enum'lar bitta joyda: `src/common/enums/`
- Controller ichida biznes-mantiq **yozilmaydi** — faqat service chaqiriladi
- Prisma raw query ishlatilmaydi (kerak bo'lsa — parametrli)
- Ko'p yozuvli operatsiyalar `$transaction` ichida

### Nomlash
- Fayl: `kebab-case.ts`
- Klass: `PascalCase`
- Prisma model: `PascalCase` (singular) — `Product`, `OrderItem`
- Endpoint: `kebab-case` — `/unread-count`
- DB ustun: Prisma `camelCase`, `@map` bilan `snake_case`

## Muhit

```bash
pnpm start:dev      # ishga tushirish
pnpm db:seed        # test ma'lumotlari
pnpm build          # tekshirish
```

`/dev/*` endpointlar (mock to'lovni simulyatsiya qilish) faqat
`NODE_ENV=development` da ro'yxatdan o'tadi.

## Ochiq savollar

TZ'da mijozdan javob kutilayotgan 7 ta savol bor (`task.txt` oxirida).
Har biri uchun vaqtinchalik qaror qabul qilingan va **interfeys ortiga yashirilgan** —
javob kelganda faqat bitta joy tahrirlanadi. Ish to'xtamaydi.
