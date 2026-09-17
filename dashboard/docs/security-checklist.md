# Dashboard — xavfsizlik yakuniy tekshiruvi (D-048)

Sana: 2026-09-17. Tekshirilgan holat: `dashboard/` (commit qilinmagan ish nusxasi), backend `api/` — lokal.
Har band uchun **dalil** — kod joyi, test yoki haqiqiy backendga so'rov natijasi.

⚠ Asosiy qoida (G4): frontend yashirishi — qulaylik; haqiqiy himoya backendda (`@Roles`, `BranchScopeService`).
Shuning uchun har band ikki tomondan tekshirildi: UI nima qiladi va backend nima qaytaradi.

| # | Band | Natija |
|---|------|--------|
| 1 | Token saqlanishi | ✅ qaror saqlanadi, ⚠ tavsiya bor |
| 2 | Vaqtinchalik parol saqlanmaydi | ✅ |
| 3 | `branchId` formadan yuborilmaydi (G5) | ✅ |
| 4 | Yashirin sahifa URL orqali ochilmaydi | ✅ |
| 5 | 404 "ruxsat yo'q" deb ko'rsatilmaydi | ✅ |
| 6 | `dangerouslySetInnerHTML` yo'q | ✅ |
| 7 | Chiqishda kesh tozalanadi | ✅ (test qo'shildi) |
| 8 | `.env` da maxfiy kalit yo'q | ✅ (build ogohlantirishi qo'shildi) |
| 9 | `pnpm audit` | ✅ zaiflik yo'q |
| 10 | Backend xato matnida ichki ma'lumot yo'q | ✅ |

---

## 1. Token saqlanishi (D-006 qarori qayta ko'rildi)

- `access` token — faqat xotirada (`src/shared/auth/token-store.ts`), 15 daqiqa yashaydi.
- `refresh` token — `localStorage` (`vk-dashboard-refresh-token`): sahifa yangilanganda sessiya qolsin.
  Backend httpOnly cookie o'rnatmaydi — token faqat javob tanasida keladi, boshqa variant yo'q.
- Xavf: XSS bo'lsa `refresh` token o'g'irlanishi mumkin. Kamaytiruvchi omillar:
  `innerHTML`/`eval`/`dangerouslySetInnerHTML` yo'q (6-band), React barcha matnni escape qiladi,
  tashqi skript yuklanmaydi, `vercel.json` da `X-Frame-Options: DENY`, `nosniff`.
- Dalil: `src/shared/auth/auth.test.ts` — "access — xotirada, refresh — storage da", storage bloklansa ham ishlaydi.

**Qaror:** hozircha o'zgarmaydi. **Tavsiya (backend):** refresh tokenni `httpOnly; Secure; SameSite=Strict`
cookie'ga o'tkazish va dashboard domeni uchun CSP (`index.html` dagi rejim skripti hash bilan) — alohida task sifatida.

## 2. Vaqtinchalik parol hech qayerda saqlanmaydi

- Parol faqat komponent holatida: `TemporaryPasswordDialog` props (`src/shared/ui/TemporaryPasswordDialog.tsx`).
- Mutatsiya natijasi keshdan darhol tozalanadi: mijoz — `CreateCustomerModal.tsx` (`create.reset()`),
  parolni tiklash — `ResetPasswordFlow.tsx` (`mutation.reset()`), xodim — `StaffFormModal.tsx` (`create.reset()`);
  hook'larda `gcTime: 0` (`features/customers/api.ts`, `features/staff/api.ts`).
- Log yo'q: `console.*` faqat `main.tsx` (dev'da API manzili) va `RouteErrorPage` (dev'da xato) — parol yo'q.
- Dialog "Parolni saqladim" belgisisiz yopilmaydi (✕, "Yopish", Esc — hammasi o'chiq).
- **E2E dalil** (`e2e/01-super-admin.spec.ts`, 4-ssenariy): dialog yopilgach parol matni sahifada yo'q,
  `localStorage`, `sessionStorage` va URL'da ham yo'q.

## 3. Hech bir sahifa `branchId` ni formadan yubormaydi (G5)

So'rovga `branchId` tushadigan BARCHA joylar ko'rib chiqildi (`grep branchId features pages`):

| Joy | Kim uchun | Izoh |
|---|---|---|
| `customers/customer-form.ts` | faqat SUPER_ADMIN | `isSuperAdmin && v.branchId` |
| `customers/customer-profile.ts` | faqat SUPER_ADMIN | `can.changeBranch` |
| `staff/staff-form.ts` | faqat SUPER_ADMIN | BRANCH_ADMIN'da maydon yo'q (`branchOptions: null`), tahrirda `canChangeBranch` |
| `orders/manual.ts` | faqat SUPER_ADMIN, hisobsiz xaridor | mijozda umuman yuborilmaydi |
| `prices/prices.ts`, `AddPriceModal.tsx` | faqat SUPER_ADMIN | |
| `delivery/tariffs.ts` | faqat SUPER_ADMIN | filial adminida `branchId = null` |
| ro'yxat filtrlari (orders, customers, prices, staff) | faqat SUPER_ADMIN | boshqa rolda URL'dagi `branchId` **o'qilmaydi** (`list.test.ts` — G5 testlari) |
| `pricing-rules/tariffs-api.ts`, `useBranchManagers`, `useManagerOptions` | — | qiymat API javobidan (mijoz/buyurtma filiali), forma kiritmasi emas |

Backend dalili (API orqali tekshirildi): BRANCH_ADMIN begona `branchId` bilan — buyurtmalar ro'yxati 404,
tarif o'qish/yozish 404, ta'minot buyurtmasi 404, menejerni boshqa filialga o'tkazish 404.

## 4. Rolga ko'ra yashirilgan sahifa URL orqali ham ochilmaydi

- UI: `src/app/routes.tsx` — barcha menyu bo'limlari va barcha karta/yaratish marshrutlari `RequireRole` ichida
  (skript bilan tekshirildi: `products/new`, `products/:id`, `customers/:id` (+ `pricing` tab), `orders/new`,
  `orders/:id`, `supply-orders/new`, `supply-orders/:id`). Rol yetmasa — 403 sahifasi, chunk yuklanmaydi.
  `?view=moderators` SUPER_ADMIN bo'lmasa menejerlarga qaytadi.
- Backend (ikkinchi qatlam), haqiqiy so'rovlar bilan: MANAGER → `/admin/settings` 403, `/admin/managers` 403,
  `PATCH …/assign` 403, `POST /admin/payments/…/confirm` 403; BRANCH_ADMIN → `/admin/moderators` 403,
  `/admin/branch-orders` 403, `POST /admin/branches` 403; MODERATOR → `POST /branch-orders` 403.
- Testlar: `src/app/navigation.test.ts` (rol → menyu), E2E 8 (BRANCH_ADMIN'da Moderatorlar yo'q), E2E 10 (MANAGER zaxira maydonlari disabled).

## 5. 404 "ruxsat yo'q" deb ko'rsatilmaydi

- `src/shared/lib/error-message.ts`: 404 → "Topilmadi. U o'chirilgan yoki sizga ko'rinmaydi."
- `RouteErrorPage` 404 → `NotFoundPage`; `route-error.test.ts`.
- Testlar: `OrderDetailPage.test.tsx` (404 → "Topilmadi", "ruxsat" so'zi yo'q); **E2E 9** — BRANCH_ADMIN begona
  filial mijoz kartasini URL orqali ochadi → "Topilmadi", mijoz nomi ham, "ruxsat" ham chiqmaydi.

## 6. Foydalanuvchi matni `dangerouslySetInnerHTML` ga tushmaydi

`grep -rn "dangerouslySetInnerHTML|innerHTML|eval(|new Function" src` — **0 natija**.
Izoh, sabab, nom kabi matnlar faqat JSX orqali (`whitespace-pre-line` bilan) chiqariladi.

## 7. Chiqishda barcha kesh tozalanadi

- `src/features/auth/session.ts` — `tokenStore` o'zgarib sessiya tugasa (chiqish yoki refresh rad etilsa)
  `queryClient.clear()` — so'rovlar ham, mutatsiyalar ham.
- **Yangi test** `src/features/auth/session.test.ts`: kesh va mutatsiya keshi to'ldiriladi → `tokenStore.clear()` → ikkalasi bo'sh.
- `auth.test.ts` — "logout — server xato bersa ham local holat tozalanadi".
- `localStorage` da qoladigan boshqa narsa: faqat rejim (`vk-dashboard-theme`) va yig'ilgan menyu belgisi — shaxsiy ma'lumot emas.

## 8. `.env` da maxfiy kalit yo'q

- `.env.example` va `.env` — faqat `VITE_API_URL`. Kodda `import.meta.env` faqat `src/shared/config/env.ts` orqali
  (+ `DEV` bayrog'i).
- `dist/` skanerlandi: `JWT_SECRET`, `DATABASE_URL`, `postgres:`, seed paroli — **topilmadi**.
- Topilgan va yopilgan xavf: `dist` ga `.env` dagi `http://localhost:3000/api/v1` yoziladi. **Qo'shildi:**
  `vite.config.ts` production build'da localhost API manzilini ko'rsa ogohlantiradi; README "Deploy" bo'limi.

## 9. Bog'liqliklar

`pnpm audit` → **No known vulnerabilities found** (2026-09-17). Yangi dev-paketlar (Testing Library, MSW, jsdom,
Playwright) faqat `devDependencies` — production bundle'ga kirmaydi.

## 10. Backend xato matni ichki ma'lumot chiqarmaydi

- Backend: `api/src/common/filters/all-exceptions.filter.ts` — kutilmagan xato → "Serverda kutilmagan xatolik yuz berdi",
  stack faqat server logiga; Prisma validatsiya xatosi → umumiy matn.
- Frontend (ikkinchi qatlam): `errorMessage` 5xx uchun backend matnini umuman ko'rsatmaydi — "Serverda xato.
  Qayta urinib ko'ring." + `requestId` (log'dan topish uchun). 4xx da backend matni (o'zbekcha, validatsiya) ko'rsatiladi.
- Tekshiruv davomida ko'rilgan barcha 400/404/409 javoblari — faqat foydalanuvchi uchun matn (SQL, stack yo'q).

---

### Qo'shimcha: deploy sarlavhalari

`vercel.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (kamera, mikrofon, geolokatsiya o'chiq). CSP qo'shilmadi — `index.html` dagi inline rejim skripti
hash talab qiladi (1-band tavsiyasi bilan birga qilinadi).

### Ochiq tavsiyalar (bloklamaydi)

1. Refresh token — httpOnly cookie (backend o'zgarishi).
2. CSP sarlavhasi (inline skript hash'i bilan).
3. Production'da backend `CORS_ORIGINS=*` qoldirilmasin — faqat dashboard/storefront domenlari (README'da).
