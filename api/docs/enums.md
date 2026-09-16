# Enum'lar ro'yxati (B-048)

Barcha enum qiymatlari va ularning o'zbekcha ma'nosi. Frontend status
nomlarini ekranda shu tarzda ko'rsatishi kerak — API javobida faqat
`ENUM_QIYMAT` (masalan `SEARCHING_TRANSPORT`) keladi, o'zbekcha matn emas.

Manba — `prisma/schema.prisma` (bazaga bog'liq enum'lar) va
`src/common/enums/` (bazada yo'q, hisoblanadigan enum'lar:
`StockStatus`, `PublicAvailability`, `SortOrder`, `ProductSortField`).

## OrderStatus — buyurtma bosqichi

| Qiymat                | O'zbekcha            |
| ---------------------- | -------------------- |
| `NEW`                  | Buyurtma qabul qilindi |
| `SEARCHING_TRANSPORT`  | Mashina qidirilmoqda |
| `LOADING`              | Yuklash jarayonida    |
| `DELIVERING`           | Yetkazib berilmoqda   |
| `DELIVERED`            | Yetkazildi            |
| `CANCELLED`            | Bekor qilindi         |

`DELIVERED` va `CANCELLED` — yakuniy holatlar, ulardan chiqish yo'q.
Ikki yo'l bor (B-029):

- **Yetkazib berish bilan:** `NEW → SEARCHING_TRANSPORT → LOADING → DELIVERING → DELIVERED`
- **Olib ketish (yetkazib berishsiz):** `NEW → LOADING → DELIVERED`
- `CANCELLED` — faqat yuk yo'lga chiqquncha (`NEW`, `SEARCHING_TRANSPORT`, `LOADING`)

Ruxsat etilgan keyingi qadamlar har javobda `allowedNextStatuses`
maydonida keladi — frontend bu ro'yxatni qattiq yozmasligi kerak.

## OrderSource — buyurtma qaysi kanaldan kelgan

| Qiymat      | O'zbekcha                                  |
| ----------- | ------------------------------------------- |
| `WEBSITE`   | Optom mijoz saytdan o'zi bergan             |
| `TELEGRAM`  | Telegram orqali — menejer qo'lda kiritgan   |
| `PHONE`     | Qo'ng'iroq orqali — menejer qo'lda kiritgan |
| `ADMIN`     | Admin panelidan to'g'ridan-to'g'ri          |

## OrderingType — kim buyurtma bermoqda

`OrderSource` bilan ARALASHTIRMASLIK kerak — bu boshqa o'lcham (TZ 3.7.2).

| Qiymat      | O'zbekcha                                                |
| ----------- | --------------------------------------------------------- |
| `CUSTOMER`  | Filialga biriktirilgan optom mijoz                         |
| `BRANCH`    | RETAIL filial → markaziy ombordan ta'minot buyurtmasi (B-058) |
| `AGENT`     | Markaziy omborga bevosita biriktirilgan B2B agent          |

## PaymentMethod — to'lov usuli

| Qiymat           | O'zbekcha                                              |
| ---------------- | -------------------------------------------------------- |
| `CASH`           | Naqd pul                                                  |
| `CARD`           | Karta orqali avtomatik (hozircha mock, B-050 gacha)       |
| `BANK_TRANSFER`  | Shartnoma asosida hisob raqamga o'tkazma (perechislenie)  |

## PaymentStatus — to'lov holati

| Qiymat       | O'zbekcha                                    |
| ------------ | ----------------------------------------------|
| `PENDING`    | Kutilmoqda                                    |
| `PAID`       | To'landi                                      |
| `FAILED`     | Muvaffaqiyatsiz                               |
| `CANCELLED`  | Bekor qilindi (buyurtma CANCELLED bo'lganda)  |

## AccountTransactionType — hisob harakati turi

| Qiymat         | O'zbekcha                          | `amount` ishorasi |
| -------------- | ------------------------------------ | ------------------ |
| `DEBT`         | Yangi qarz (buyurtma berilganda)     | musbat (+)          |
| `PAYMENT`      | To'lov tushdi                        | manfiy (−)          |
| `ADJUSTMENT`   | Tuzatish                             | ikkalasi ham        |

⚠ Yozuv hech qachon o'zgartirilmaydi/o'chirilmaydi — xato tuzatish yo'li
teskari ishorali `ADJUSTMENT`. Balans = `Σ amount`.

## NotificationType — bildirishnoma turi

Faqat optom mijoz yoki xodimga boradi — chakana mijozda hisob yo'q.

| Qiymat                  | O'zbekcha                     |
| ------------------------ | -------------------------------|
| `ORDER_CREATED`          | Buyurtma qabul qilindi          |
| `ORDER_STATUS_CHANGED`   | Buyurtma holati o'zgardi        |
| `PAYMENT_RECEIVED`       | "To'landi" xabarnomasi          |
| `NEW_PRODUCT`            | Yangi mahsulot qo'shildi        |
| `COMMENT_REPLY`          | Izoh/javob keldi                |
| `CONTRACT_READY`         | Shartnoma tayyor bo'ldi va yuborildi |

## ContractStatus — shartnoma holati (B-045, 🧪 mock)

| Qiymat    | O'zbekcha                                              |
| --------- | --------------------------------------------------------|
| `DRAFT`   | Generatsiya qilindi, hali yuborilmagan                   |
| `SENT`    | Mijozga Telegram orqali yuborildi (🧪 mock)               |
| `SIGNED`  | E-IMZO bilan imzolangan — haqiqiy integratsiya kelgach   |

## UserRole — xodim rollari

| Qiymat          | `branchId`              | O'zbekcha                                          |
| --------------- | ------------------------ | ---------------------------------------------------- |
| `SUPER_ADMIN`   | `null`                   | Hamma filialni ko'radi                               |
| `BRANCH_ADMIN`  | majburiy (RETAIL)        | Faqat o'z filiali                                    |
| `MANAGER`       | majburiy (RETAIL)        | BRANCH_ADMIN bilan bir xil doira                     |
| `MODERATOR`     | majburiy (CENTRAL)       | Markaziy ombor xodimi (filial/agent buyurtmalari, B-058) |

## BranchType — filial turi

| Qiymat      | O'zbekcha                                                        |
| ----------- | -------------------------------------------------------------------|
| `RETAIL`    | Farg'ona, Andijon, Namangan, Qo'qon — faqat NARX, o'z zaxirasi yo'q |
| `CENTRAL`   | 1-2 dona — haqiqiy ZAXIRA shu yerda, xodimi MODERATOR               |

Public `GET /branches` faqat `RETAIL` filiallarni qaytaradi — `type`
maydonining o'zi ham javobga chiqmaydi (markaziy ombor mijozga ko'rinmaydi).

## ProductSurface — mahsulot sirti

| Qiymat    | O'zbekcha       |
| --------- | ---------------- |
| `POL`     | Pol (yer) uchun  |
| `DEVOR`   | Devor uchun      |

## MediaType — mahsulot media turi

| Qiymat        | O'zbekcha                       |
| ------------- | ---------------------------------|
| `IMAGE`       | Oddiy surat                       |
| `IMAGE_360`   | 360° aylanuvchi surat to'plami    |
| `VIDEO_360`   | 360° video                        |

## PricingDomain / PricingScope / PricingValueType — narx zanjiri (B-052)

Bular API javobida ko'rinmaydi (faqat SUPER_ADMIN narx qoidalarini
boshqarganda) — mijoz va oddiy menejer faqat yakuniy narxni ko'radi.

**PricingDomain** — narx qaysi narsaga tegishli:

| Qiymat        | O'zbekcha        |
| ------------- | ------------------|
| `PRODUCT`     | Mahsulot narxi     |
| `TRANSPORT`   | Yo'l kira          |

**PricingScope** — qoida qanchalik aniq (eng aniqi g'olib chiqadi):

| Qiymat      | Domen        | O'zbekcha                          |
| ----------- | ------------ | -------------------------------------|
| `PRODUCT`   | PRODUCT      | Aynan shu mahsulotga                 |
| `FACTORY`   | PRODUCT      | Shu zavodning barcha mahsulotiga     |
| `ROUTE`     | TRANSPORT    | Aynan shu yo'nalishga (filial×viloyat×transport) |
| `ALL`       | ikkalasi ham | Mijozga umumiy qoida                 |

**PricingValueType** — qiymat qanday berilgan:

| Qiymat      | O'zbekcha                                                          |
| ----------- | ---------------------------------------------------------------------|
| `FIXED`     | Aniq summa — "bu mijozga aynan shu kafel 8 000 so'm"                 |
| `PERCENT`   | Foiz — "bazaviy narxdan −20%" (bazaviy narx o'zgarsa, avtomatik moslashadi) |

## StockStatus — zaxira holati (bazada yo'q, hisoblanadi)

Faqat AUTH bor joyda ko'rinadi — optom mijoz kabineti va admin panel.

| Qiymat            | Belgi | O'zbekcha            |
| ------------------ | ----- | ---------------------|
| `IN_STOCK`         | 🟢    | Yetarli               |
| `LOW`              | 🟡    | Kam qoldi             |
| `OUT_OF_STOCK`     | 🔴    | Tugagan               |

Chegara (`lowStockThreshold`) admin panelidan sozlanadi — mahsulotga
xos yoki `stock.lowThresholdPallets` global sozlamasidan.

## PublicAvailability — ochiq katalog uchun (bazada yo'q)

Mehmon (login qilmagan) FAQAT shu ikki holatni ko'radi — aniq son yoki
uch rangli indikator hech qachon ochiq javobga chiqmaydi (TZ 3.2).

| Qiymat          | O'zbekcha       |
| ---------------- | ----------------|
| `AVAILABLE`      | Mavjud           |
| `UNAVAILABLE`    | Mavjud emas      |

## SortOrder / ProductSortField — sahifalash (bazada yo'q)

`SortOrder`: `asc` \| `desc`.

`ProductSortField` (`GET /products?sortBy=`): `name` \| `createdAt` \| `viewCount`.
⚠ Narx bo'yicha saralash YO'Q — narx `Product`da emas va mijozga qarab
o'zgaradi, ochiq katalog uni umuman ko'rmaydi.
