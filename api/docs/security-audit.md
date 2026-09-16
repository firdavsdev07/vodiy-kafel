# Xavfsizlik yakuniy tekshiruvi (B-049)

Sana: 2026-09-16. Har band uchun: tasdiq manbai (kod/test) va agar tuzatish
kerak bo'lsa — nima qilingani.

## Umumiy

| # | Tekshiruv | Holat | Isbot |
|---|-----------|-------|-------|
| 1 | Public endpoint narx qaytarmaydi | ✅ | `ProductListItemResponseDto`/`ProductDetailResponseDto` da `price` maydoni yo'q; `test/critical-flows.e2e-spec.ts` §1 tekshiradi |
| 2 | Public endpoint aniq zaxira sonini qaytarmaydi | ✅ | Faqat `availability: AVAILABLE\|UNAVAILABLE` (`PublicAvailability`); aniq son (`stockPallets`) faqat `/admin/product-stocks` da | 
| 3 | Buyurtma narxi faqat backendda, filial narxi bo'yicha | ✅ | `CreateOrderDto` da narx/summa maydoni umuman yo'q; `OrdersService.create` narxni `QuoteService` orqali qayta hisoblaydi. `test/critical-flows.e2e-spec.ts` §4 — "frontend" soxta `price`/`grandTotal`/`branchId` yuborsa ham e'tiborsiz qoldirilishini tekshiradi |
| 4 | Har bir `/me/*` da egalik tekshiruvi (IDOR yo'q) | ✅ | `me-orders`, `me-account`, `me-notifications`, `me-updates` — barchasi `@CurrentActor()` dan olingan `customerId` bo'yicha filtrlaydi, so'rov parametridan emas. `test/critical-flows.e2e-spec.ts` §6 — begona buyurtma → 404 |

## Filial izolyatsiyasi (B-051)

| # | Tekshiruv | Holat | Isbot |
|---|-----------|-------|-------|
| 5 | Har bir admin endpoint `BranchScopeService` orqali o'tadi | ✅ | `grep -rn "branchScope\."` — narx, mijoz, buyurtma, tarif, xodim servislarining barchasida `resolve`/`assertWithinScope`/`requireBranchId` ishlatiladi (`src/auth/branch-scope.service.ts`, B-051 — yagona joy) |
| 6 | Prisma so'rovlarida `branchId` filtri unutilmagan | ✅ | Filtr markazlashgan — servis `toPrismaFilter(scope)` dan oladi, qo'lda yozilmaydi; `branch-scope.service.spec.ts` uchala holatni (`ALL`/`SINGLE`/`NONE`) sinaydi |
| 7 | `branchId` body/query orqali "aldab" o'zgartirib bo'lmaydi | ✅ | Har bir yozuvchi endpoint `requireBranchId(actor, dto.branchId)` chaqiradi — cheklangan rol uchun so'ralgan qiymat E'TIBORGA OLINMAYDI, mos kelmasa 404. `test/critical-flows.e2e-spec.ts` §8 |
| 8 | Begona filial resursi → 404 (403 emas) | ✅ | `BranchScopeService` ning o'zi shuni ta'minlaydi (`NOT_FOUND` konstantasi); `test/critical-flows.e2e-spec.ts` §6, §8 |

## Umumiy xavfsizlik

| # | Tekshiruv | Holat | Isbot / tuzatish |
|---|-----------|-------|--------------------|
| 9 | Rate limiting — auth endpointlarida | 🐞→✅ | **Tuzatildi (2026-09-16):** avval umuman yo'q edi. `@nestjs/throttler` qo'shildi, `AuthController` butunlay `ThrottlerGuard` bilan qoplandi — bitta IP daqiqasiga 10 so'rov (`AuthModule`). `test/rate-limiting.e2e-spec.ts` — 11-urinishdan boshlab `429` qaytishini tasdiqlaydi |
| 10 | Parollar bcrypt, javoblarda hech qachon chiqmaydi | ✅ | `bcrypt.hash`/`compare` (`AuthService`); har bir Prisma so'rovda `passwordHash` faqat kerak bo'lgan joyda `select` bilan olinadi, javob DTO'larida umuman yo'q (`UserProfileResponseDto` izohi) |
| 11 | Webhook idempotency ishlaydi | ✅ | `PaymentWebhookService.apply` — holat faqat `PENDING` dan optimistik qulf bilan o'tadi; qayta kelgan xabar `DUPLICATE`/`IGNORED` qaytaradi, ikki marta hisoblanmaydi. `payment-webhook.service.spec.ts` |
| 12 | `/dev/*` endpointlar production'da o'chirilgan | ✅ | `DevPaymentsModule` `ConditionalModule.registerWhen(env => env.NODE_ENV === 'development')` bilan ro'yxatdan o'tadi — boshqa muhitda yo'l umuman mavjud emas (404, guard emas — modul yo'q) |
| 13 | Fayl yuklash: tur va hajm validatsiyasi | ✅ | `MAX_UPLOAD_BYTES = 10MB` (multer limit); tur **mazmundan** aniqlanadi (`detectFileKind`, magic bytes) — `Content-Type`/kengaytma emas, stored-XSS oldini oladi. Static serving `X-Content-Type-Options: nosniff` + CSP sandbox bilan (`main.ts`) |
| 14 | Prisma raw query yo'q (yoki parametrli) | ✅ | `src/` da `$queryRaw`/`$executeRaw` UMUMAN yo'q. Yagona joy — `prisma/seed.ts` (runtime API kodi emas, dev/test qurilma skripti), u ham parametrsiz identifikatorlarni `information_schema`dan o'zi o'qiydi, foydalanuvchi kiritmaydi |

## Xulosa

14 banddan 13 tasi allaqachon to'g'ri qurilgan edi (ko'pchiligi tegishli
unit/e2e testlar bilan). Yagona haqiqiy kamchilik — **rate limiting yo'qligi**
— shu task doirasida topildi va tuzatildi. Boshqa tuzatish talab
qilinmadi.

Tekshiruv uslubi: har band uchun kod o'qildi (grep + manba fayllar), keyin
mavjud test (611 unit + 13 e2e, jumladan yangi `rate-limiting.e2e-spec.ts`)
ishga tushirilib tasdiqlandi — faraz emas.
