/**
 * Factual company information. Content reference only — no UI, layout or
 * imagery was taken from the client's previous site. See ASSETS.md §8.
 *
 * ⚠ MANZIL, ISH VAQTI VA KOORDINATA BU YERDA YO'Q (S-025). Ular
 *   `GET /branches` dan keladi — admin panelidan boshqariladi va
 *   bittadan ko'p do'kon bor. `@/shared/api` dagi `useMainBranch()`
 *   (bitta manzil kerak bo'lsa) yoki `useBranches()` (to'liq ro'yxat).
 *
 * Bu yerda qolgani — API'da MUQOBILI YO'Q narsalar: kompaniya nomi,
 * tarix, statistika, bozorlar, kafolat, umumiy telefon/pochta/ijtimoiy
 * tarmoqlar va navigatsiya. Backend o'chiq bo'lsa ham odam qo'ng'iroq
 * qila olishi uchun aloqa ma'lumoti ataylab shu yerda qoldirildi.
 */
export const company = {
  name: 'Vodiy Kafel',
  legalName: 'Vodiy Kafel Savdo Markazi',
  mark: 'VODIY KAFEL®',
  location: "FARG'ONA / UZBEKISTAN",
  tagline: 'Premium ceramic surfaces',

  statement: {
    uz: 'Dizayn tanlovdan boshlanadi.',
    en: 'Design begins with the choice.',
  },

  intro:
    "Yigirma yildan ortiq vaqt davomida biz Farg'ona vodiysiga keramika olib kelamiz. Xitoy va Hindistondagi zavodlardan — birinchi navli, tekshirilgan, katta partiyalarda. Bugun bizning omborimiz vodiydagi eng yirik tanlovlardan biri.",

  story: [
    "Hammasi bitta savdo nuqtasidan boshlangan edi. Mijoz kelardi, kafel so'rardi — biz esa uning makonini ko'rmasdan turib tavsiya bera olmasligimizni tushundik.",
    "Shundan keyin yondashuv o'zgardi. Biz mahsulot sotmaymiz, yuza tanlaymiz: xona qanchalik yorug', pol qanchalik yuk ko'taradi, devor qaysi ohangni talab qiladi. Zavod bilan to'g'ridan-to'g'ri ishlaymiz, vositachisiz.",
    "Yetkazib berish yoki savdo nuqtasida shikastlangan har qanday plita bepul almashtiriladi. Bu bizning yigirma yillik qoidamiz va u hech qachon o'zgarmagan.",
  ],

  stats: [
    { value: '20+', label: 'Yil tajriba', en: 'Years' },
    { value: '50K+', label: 'Mijozlar', en: 'Clients' },
    { value: '120+', label: 'Hamkorlar', en: 'Partners' },
    { value: '40+', label: 'Jamoa', en: 'Team' },
  ],

  markets: {
    import: ['Xitoy', 'Hindiston'],
    export: ['Qirg‘iziston', 'Qozog‘iston', 'Tojikiston'],
    note: "O'zbekiston bo'ylab optom yetkazib berish",
  },

  guarantee: {
    title: 'Bepul almashtirish',
    body:
      "Yetkazib berish jarayonida yoki savdo nuqtasida shikastlangan plita bepul almashtiriladi.",
  },

  contact: {
    phones: ['+998 91 129 66 66', '+998 77 777 52 51'],
    phoneHref: ['+998911296666', '+998777775251'],
    email: 'vodiykafelsavdo1@gmail.com',
    telegram: 'https://t.me/vodiykafelsavdo',
    instagram: 'https://instagram.com/vodiykafelsavdo',
    handle: '@vodiykafelsavdo',
  },

  /* Bosh menyu. `index` — ko'rinadigan tartib raqami, marshrut emas.
     Galereya S-027 da qo'shildi, shuning uchun undan keyingilar
     qayta raqamlandi. Buyurtma kuzatish menyuda EMAS: u kundalik
     yo'l emas, kerak bo'lganda footerdan topiladi. */
  nav: [
    { index: '01', label: 'Bosh sahifa', en: 'Home', to: '/' },
    { index: '02', label: 'Katalog', en: 'Catalog', to: '/catalog' },
    { index: '03', label: 'Kategoriyalar', en: 'Categories', to: '/categories' },
    { index: '04', label: 'Galereya', en: 'Gallery', to: '/gallery' },
    { index: '05', label: 'Biz haqimizda', en: 'About', to: '/about' },
    { index: '06', label: 'Aloqa', en: 'Contact', to: '/contact' },
  ],
}

export default company
