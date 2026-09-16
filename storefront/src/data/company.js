import { INTERIOR, TRAVERTINE } from './images'

/**
 * Factual company information. Content reference only — no UI, layout or
 * imagery was taken from the client's previous site. See ASSETS.md §8.
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

  showroom: {
    city: "Farg'ona",
    label: "FARG'ONA SHOWROOM",
    region: "Farg'ona viloyati",
    street: "Vatan ravnaqi ko'chasi 47",
    landmark: "Urjuza klinikasi va Farg'ona bolalar shifoxonasi yaqinida",
    hours: '08:00 — 17:00',
    days: 'Dushanba — Shanba',
    closed: 'Yakshanba — dam olish kuni',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=40.3864,71.7864',
    image: INTERIOR[4],
    texture: TRAVERTINE[5],
  },

  contact: {
    phones: ['+998 91 129 66 66', '+998 77 777 52 51'],
    phoneHref: ['+998911296666', '+998777775251'],
    email: 'vodiykafelsavdo1@gmail.com',
    telegram: 'https://t.me/vodiykafelsavdo',
    instagram: 'https://instagram.com/vodiykafelsavdo',
    handle: '@vodiykafelsavdo',
  },

  nav: [
    { index: '01', label: 'Bosh sahifa', en: 'Home', to: '/' },
    { index: '02', label: 'Katalog', en: 'Catalog', to: '/catalog' },
    { index: '03', label: 'Kategoriyalar', en: 'Categories', to: '/categories' },
    { index: '04', label: 'Biz haqimizda', en: 'About', to: '/about' },
    { index: '05', label: 'Aloqa', en: 'Contact', to: '/contact' },
  ],
}

export default company
