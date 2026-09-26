import { BATH, INTERIOR, MARBLE, TILE, TRAVERTINE } from './images'

/**
 * Local mock categories. No backend, no fetch — see ASSETS.md §8.
 * Shape is intentionally close to what an API would return later.
 */
export const categories = [
  {
    id: 1,
    index: '01',
    slug: 'keramogranit',
    name: 'Keramogranit',
    nameEn: 'Porcelain stoneware',
    tagline: 'Eng zich, eng chidamli yuza',
    description:
      "Yuqori bosim ostida presslanadi va 1250°C da pishiriladi. Suv shimishi 0,05% dan past — shuning uchun u sovuqqa ham, og'ir yukka ham bardosh beradi. Katta formatlar choklarni kamaytiradi va makonni yaxlit ko'rsatadi.",
    cover: MARBLE[0],
    stills: [MARBLE[0], INTERIOR[1], TILE[4], MARBLE[6]],
  },
  {
    id: 2,
    index: '02',
    slug: 'keramika',
    name: 'Keramika',
    nameEn: 'Glazed ceramic',
    tagline: "Devor uchun yengil va aniq",
    description:
      "Sirlangan keramika — rang va naqsh eng aniq chiqadigan yuza. Yengil bo'lgani uchun devorga oson o'rnatiladi, oshxona va hammom uchun eng ko'p tanlanadigan yechim.",
    cover: TILE[1],
    stills: [TILE[1], BATH[0], TILE[8], INTERIOR[5]],
  },
  {
    id: 3,
    index: '03',
    slug: 'marmar-effekt',
    name: 'Marmar effekt',
    nameEn: 'Marble effect',
    tagline: 'Marmarning tasviri, keramikaning xulqi',
    description:
      "Calacatta, Statuario, Onix — tabiiy marmar tomirlari raqamli bosma orqali qayta tiklanadi. Marmardan farqli o'laroq dog' o'tkazmaydi, jilosini yo'qotmaydi va parvarish talab qilmaydi.",
    cover: MARBLE[3],
    stills: [MARBLE[3], MARBLE[9], INTERIOR[3], BATH[4]],
  },
  {
    id: 4,
    index: '04',
    slug: 'tosh-effekt',
    name: 'Tosh effekt',
    nameEn: 'Stone effect',
    tagline: "Travertin, bazalt, ohaktosh",
    description:
      "Tabiiy toshning donadorligi va issiq ohangi. Sirt strukturasi qo'lga sezilarli — yorug'lik kun davomida yuzada boshqacha o'ynaydi. Ichki va tashqi makonlarda birdek ishlaydi.",
    cover: TRAVERTINE[0],
    stills: [TRAVERTINE[0], TRAVERTINE[3], INTERIOR[8], TRAVERTINE[6]],
  },
  {
    id: 5,
    index: '05',
    slug: 'devor-uchun',
    name: 'Devor uchun',
    nameEn: 'Wall surfaces',
    tagline: '30 × 60 va katta formatlar',
    description:
      "Devor uchun ishlab chiqarilgan yupqa va yengil plitalar. Oshxona fartugi, hammom devorlari va dekorativ panellar uchun. Jilo darajasi glossy dan to'liq matt gacha.",
    cover: BATH[1],
    stills: [BATH[1], TILE[2], BATH[7], INTERIOR[10]],
  },
  {
    id: 6,
    index: '06',
    slug: 'pol-uchun',
    name: 'Pol uchun',
    nameEn: 'Floor surfaces',
    tagline: "Yuqori yuklamaga hisoblangan",
    description:
      "PEI IV va V sinfidagi pol qoplamalari. Turar joy, do'kon, ofis va jamoat binolari uchun. Sirpanishga qarshilik R9 dan R11 gacha — nam zonalar uchun ham mos.",
    cover: INTERIOR[0],
    stills: [INTERIOR[0], TILE[11], MARBLE[12], INTERIOR[13]],
  },
  {
    id: 7,
    index: '07',
    slug: 'premium',
    name: 'Premium',
    nameEn: 'Premium selection',
    tagline: "Cheklangan partiyalar",
    description:
      "Katta format, qalinlashtirilgan qirra va sayqallangan yuza. Har bir partiya cheklangan — tomirlar takrorlanmaydi. Loyiha ob'ektlari va xususiy interyerlar uchun.",
    cover: MARBLE[7],
    stills: [MARBLE[7], BATH[9], MARBLE[13], INTERIOR[6]],
  },
  {
    id: 8,
    index: '08',
    slug: 'outdoor',
    name: 'Outdoor',
    nameEn: 'Exterior',
    tagline: '20 mm — terrassa va yo‘lak',
    description:
      "20 mm qalinlikdagi keramogranit. Sovuqqa chidamli, sirpanmaydigan, quyoshda rangini yo'qotmaydigan. Hovli, terrassa, basseyn atrofi va piyoda yo'laklari uchun.",
    cover: TRAVERTINE[2],
    stills: [TRAVERTINE[2], INTERIOR[2], TRAVERTINE[8], INTERIOR[11]],
  },
]

export const categoryBySlug = (slug) => categories.find((c) => c.slug === slug)
