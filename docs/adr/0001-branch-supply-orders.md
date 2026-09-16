# ADR 0001 — Filial → markaziy ombor ta'minot buyurtmasi (B-058)

**Holat:** qabul qilindi (2026-09-16) · **Manba:** TZ 3.7.2, task B-058

## Kontekst

Do'kon (RETAIL) filialining o'z zaxirasi yo'q. O'zida yo'q mahsulotni
markaziy ombordan (CENTRAL) telefon qilmasdan, "xuddi mijoz kabi" buyurtma
qilishi kerak: real vaqtda narx va yo'l kira bilan. Sxemada buning uchun
`Order.orderingType = BRANCH` va `orderingBranchId` allaqachon bor, baza
CHECK'lari bilan (`ordering_branch_id` majburiy, `customer_id` bo'sh).

## Qaror

1. **Alohida jadval yo'q** — o'sha `Order` / `OrderItem`, o'sha
   `OrdersService.place()`: narx hisobi, zaxira tekshiruvi, raqam, tranzaksiya,
   `order.created` hodisasi. Ikkinchi oqim yozilmaydi.
2. **Kim bajaradi / kim buyurtma beradi:**
   `branchId` = markaziy ombor (moderator shu bo'yicha ko'radi, B-051),
   `orderingBranchId` = buyurtma bergan do'kon (tokendan).
3. **Narx** — markaziy omborning `BranchProduct` narxi (seed: ta'minot narxi,
   chakanadan arzon) va markazning `BranchRegionTariff` tariflari. Individual
   mijoz qoidalari (PricingRule) qo'llanmaydi — xaridor mijoz emas.
   → B-053 ochiq savoli ("markaz uchun ham tarif kerakmi") — **ha**.
4. **To'lov** — ichki hisob-kitob: `BANK_TRANSFER`, PENDING. Mijoz hisobi
   (AccountTransaction) yozilmaydi — xaridor mijoz emas.
5. **Menejer** — biriktirilmaydi (markazda MANAGER yo'q); moderator boshqaradi.
6. **Markaziy ombor tanlovi** — faol CENTRAL bitta bo'lsa avtomatik; bir
   nechta bo'lsa `centralBranchId` majburiy.
7. **Ruxsatlar** — yaratish: faol RETAIL filialning BRANCH_ADMIN/MANAGER;
   ro'yxat: do'kon — o'zinikilar (`orderingBranchId`), markaz — o'ziga
   kelganlar (`branchId`); holat — MODERATOR/SUPER_ADMIN, B-029 matritsasi.
8. **Bildirishnoma** — "xaridor" = buyurtma bergan filial admini(lari).

## Oqibatlar

- Hozircha filial zaxirasi yuritilmaydi (TZ 8.2): yetkazilgan ta'minot faqat
  buyurtma yozuvi sifatida qoladi; markaz zaxirasi avtomatik kamaymaydi
  (mijoz buyurtmasidagi kabi — ochiq savol).
- ETA (yetib kelish vaqti) uchun ma'lumot manbai yo'q — javobda qaytmaydi.
- Filial zaxirasi kelajakda qo'shilsa: DELIVERED holatida `orderingBranchId`
  zaxirasiga kirim — faqat holat o'zgarishi tinglovchisi qo'shiladi.
