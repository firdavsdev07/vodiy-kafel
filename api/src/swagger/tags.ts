/**
 * Swagger bo'limlari. Controller'da: @ApiTags(SwaggerTag.Catalog)
 * Yangi tag faqat shu yerdan qo'shiladi — ro'yxat tarqab ketmasin.
 */
export const SwaggerTag = {
  Auth: 'Auth',
  Catalog: 'Catalog',
  Calculator: 'Calculator',
  Delivery: 'Delivery',
  Pricing: 'Pricing',
  Orders: 'Orders',
  Payments: 'Payments',
  Customers: 'Customers',
  Branches: 'Branches',
  Partners: 'Partners',
  Managers: 'Managers',
  Moderators: 'Moderators',
  Notifications: 'Notifications',
  Settings: 'Settings',
  Admin: 'Admin',
} as const;

export type SwaggerTag = (typeof SwaggerTag)[keyof typeof SwaggerTag];

/** Tag → qisqa tavsif (Swagger sahifasida bo'lim ostida chiqadi). */
export const SWAGGER_TAG_DESCRIPTIONS: Record<SwaggerTag, string> = {
  Auth: 'Kirish va ro‘yxatdan o‘tish — admin, mijoz va optom mijoz',
  Catalog: 'Mahsulotlar, zavodlar, o‘lchamlar, galereya (ochiq)',
  Calculator: 'Paddon → kv², og‘irlik, summa va yo‘l kira hisobi',
  Delivery:
    'Transport turlari, viloyatlar, filial × viloyat × transport tarif matritsasi',
  Pricing: 'Mijozga individual narx/chegirma qoidalari (mahsulot va transport)',
  Orders: 'Buyurtma yaratish va holatini kuzatish',
  Payments: 'To‘lov boshlash va holatini tekshirish',
  Customers: 'Mijoz kabineti: profil, balans, tranzaksiyalar',
  Branches: 'Filiallar ro‘yxati (RETAIL va CENTRAL)',
  Partners: 'Hamkorlar ro‘yxati',
  Managers: 'Menejerlar va ular bilan bog‘lanish',
  Moderators:
    'Markaziy ombor xodimlari — filial va agent buyurtmalarini boshqaradi',
  Notifications: 'Bildirishnomalar va o‘qilmaganlar soni',
  Settings: 'Ochiq sozlamalar (zaxira chegaralari, to‘lov rekvizitlari)',
  Admin: 'Boshqaruv paneli — faqat admin/menejer uchun',
};

/** Bearer auth sxemasining nomi — @ApiBearerAuth(BEARER_AUTH) uchun. */
export const BEARER_AUTH = 'bearer';
