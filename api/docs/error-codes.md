# Xato kodlari jadvali (B-048)

Har bir xato bitta formatda keladi (`AllExceptionsFilter`):

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Mahsulot topilmadi",
  "path": "/api/v1/products/xyz",
  "timestamp": "2026-09-16T17:02:11.419Z",
  "requestId": "1339b1a6-5cf7-4d0f-9d4b-10bfbd295f49"
}
```

`message` validatsiya xatosida **matnlar massivi** (`class-validator`
xabarlari), boshqa hollarda **bitta matn**. Frontend ikkalasini ham
qabul qiladigan bitta handler yozsin.

`requestId` — shikoyat qilganda shu ID ni ayting, server logidan aynan
shu so'rov topiladi.

## HTTP statuslar — nima uchun, qachon

| Status | Nomi                  | Qachon chiqadi                                                                 |
| ------ | --------------------- | -------------------------------------------------------------------------------- |
| `400`  | Bad Request            | DTO validatsiyasi (`class-validator`), noto'g'ri filtr kombinatsiyasi (masalan `regionId` bor-u `transportTypeId` yo'q), Prisma foreign-key xatosi (bog'liq yozuv topilmadi) |
| `401`  | Unauthorized           | Token yo'q, muddati o'tgan, imzosi noto'g'ri, yoki hisob (`isActive=false`) faol emas |
| `403`  | Forbidden              | Token YAROQLI, lekin rol yetarli emas YOKI optom mijoz vaqtinchalik parolni hali almashtirmagan (`PasswordChangeRequiredGuard`) |
| `404`  | Not Found              | Yozuv umuman yo'q **YOKI** boshqa filialga tegishli — ikkalasi UYUSHTIRILMAYDI (403 emas, 404) |
| `409`  | Conflict               | Omborda yetarli emas, to'lov kutilayotgan holatda emas, holat parallel o'zgargan (optimistik qulf), unique constraint (Prisma `P2002`) |
| `500`  | Internal Server Error  | Kutilmagan server/baza xatosi — ichki tafsilot (stack, SQL) mijozga CHIQMAYDI, faqat serverda log qilinadi |

### 🔒 404 — "topilmadi" bilan "begonaniki" bir xil

Bu tasodifiy emas — ataylab shunday: agar begona filial/mijoz resursi
403 qaytarsa, so'rovchi "demak bu ID mavjud ekan" deb bilib oladi
(IDOR/enumeration). Shu sabab har doim 404: mavjud emasmi, boshqa
filialnikimi — javobdan farqi yo'q.

### 401 — uch xil sabab, bitta xabar

Login topilmadi / parol xato / hisob faol emas — uchalasi ham bir xil
`401` va bir xil matn bilan qaytadi (auth service soxta hash bilan ham
bcrypt ishlatadi, javob vaqti tenglashsin deb) — aks holda javob
vaqtidan yoki matnidan "bu login bor-yo'qligi" bilinib qolardi.

## Modulga xos maxsus holatlar

| Endpoint(lar)                              | Status | Sabab |
| -------------------------------------------- | ------ | ------- |
| `POST /orders`                               | `409`  | Omborda yetarli paddon yo'q — **qancha borligi aytilmaydi** |
| `POST /orders/:id/payment`                   | `409`  | Buyurtma bekor qilingan, allaqachon to'langan, yoki parallel so'rov |
| `PATCH /admin/orders/:id/status`             | `400`  | Ruxsat etilmagan o'tish (holat matritsasiga mos emas) yoki xuddi shu holat |
| `PATCH /admin/orders/:id/status`             | `409`  | Holat hozirgina boshqa xodim tomonidan o'zgartirilgan (optimistik qulf) |
| `PUT /admin/branch-products`                 | `400`  | SUPER_ADMIN `branchId` bermadi (majburiy) |
| `POST /dev/payments/:id/simulate`            | `400`  | Mock provayder yoqilmagan yoki to'lov provayder orqali ochilmagan (naqd/o'tkazma) |
| `POST /auth/wholesale/change-password`       | `400`  | Yangi parol qoidaga mos emas yoki joriy paroldan farq qilmaydi |
| `POST /admin/customers/:id/pricing-rules`    | `400`  | `BRANCH_ADMIN` `pricing.branchAdminMaxDiscountPercent` chegarasidan oshirmoqchi |

## Webhook (`POST /webhooks/payment`)

Bu yo'l boshqacha javob beradi — provayder o'z formatini kutadi, `{ data: ... }` ga o'ralmaydi:

| Status | Sabab |
| ------ | ------- |
| `401`  | Imzo (signature) noto'g'ri |
| `200`  | Qabul qilindi — takroriy xabar bo'lsa ham (idempotency), ikki marta hisoblanmaydi |
