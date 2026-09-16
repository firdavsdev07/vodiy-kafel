import { BATH, INTERIOR, MARBLE, TRAVERTINE } from './images'

// Curated local concept catalogue. Names and specifications are mock data;
// reference photography is credited in ASSETS.md, not claimed as inventory.
const entries = [
  ['calacatta-oro', 'Calacatta Natural', 'marmar-effekt', 'Marble Study', '120 × 60', 'Polished', MARBLE[0], BATH[1], 'Oq zamin va erkin kulrang tomirlar. Yorug‘ interyer uchun vazmin marmar talqini.'],
  ['statuario-venato', 'Statuario Soft', 'marmar-effekt', 'Marble Study', '120 × 60', 'Satin', MARBLE[1], BATH[2], 'Yengil tomirli oq yuza. Katta makonda ham sokin va yaxlit ko‘rinadi.'],
  ['travertino-classico', 'Travertino Classico', 'tosh-effekt', 'Earth Collection', '120 × 60', 'Matte', TRAVERTINE[0], INTERIOR[0], 'Uzunasiga o‘tgan travertin qatlamlari. Qum va qaymoq ohanglari yog‘och bilan uyg‘unlashadi.'],
  ['travertino-noce', 'Travertino Sabbia', 'tosh-effekt', 'Earth Collection', '60 × 120', 'Matte', TRAVERTINE[1], INTERIOR[1], 'Yumshoq qum tusidagi travertin. Issiq, tabiiy makonlar uchun.'],
  ['grigio-cemento', 'Pietra Quiet', 'keramogranit', 'Natural Architecture', '60 × 120', 'Matte', TRAVERTINE[3], INTERIOR[2], 'Toshning xotirjam ranglari va mayin tuzilishi. Kundalik hayot uchun universal yuza.'],
  ['sabbia-sand', 'Sabbia Sand', 'keramogranit', 'Natural Architecture', '60 × 60', 'Matte', TRAVERTINE[4], INTERIOR[3], 'Qum ohangidagi katta format. Och yog‘och va tabiiy matolar bilan birga ishlaydi.'],
  ['perla-glossy', 'Perla Glossy', 'keramika', 'Light & Glaze', '30 × 60', 'Glossy', MARBLE[5], BATH[4], 'Yorug‘likni qaytaradigan oq keramika. Oshxona va hammom devorlari uchun.'],
  ['latte-brillante', 'Latte Brillante', 'keramika', 'Light & Glaze', '30 × 60', 'Glossy', MARBLE[4], BATH[5], 'Sut rangidagi yumshoq naqsh. Kichik makonga yorug‘lik va chuqurlik beradi.'],
  ['bagno-bianco', 'Bagno Bianco', 'devor-uchun', 'Living Surfaces', '30 × 90', 'Satin', MARBLE[9], BATH[6], 'Oq-kulrang marmar ritmi. Devor yuzasini mayin va yaxlit ko‘rsatadi.'],
  ['muro-crema', 'Muro Crema', 'devor-uchun', 'Living Surfaces', '30 × 60', 'Satin', MARBLE[10], BATH[7], 'Krem ohangidagi sokin yuza. Yashash makonining iliq foni.'],
  ['terrazzo-bianco', 'Pietra Ivory', 'pol-uchun', 'Grounded', '60 × 120', 'Matte', TRAVERTINE[2], INTERIOR[8], 'Fil suyagi va qum orasidagi tabiiy ohang. Keng pol kompozitsiyalari uchun.'],
  ['ardesia-nera', 'Travertino Cross', 'pol-uchun', 'Grounded', '60 × 60', 'Matte', TRAVERTINE[5], INTERIOR[9], 'Ko‘ndalang kesimdan ilhomlangan travertin. Yuzada bir tekis tabiiy harakat.'],
  ['calacatta-viola', 'Calacatta Atelier', 'premium', 'Atelier 2026', '120 × 260', 'Polished', MARBLE[3], BATH[10], 'Yirik format va aniq marmar tomirlari. Interyerning asosiy yuzasi uchun tanlov.'],
  ['onix-amber', 'Crema Dorata', 'premium', 'Atelier 2026', '120 × 260', 'Polished', MARBLE[13], BATH[11], 'Issiq krem va oltin tuslar. Yorug‘lik bilan ochiladigan katta formatli yuza.'],
  ['terrazza-beige-20', 'Terrazza Beige 20', 'outdoor', 'Outside / Inside', '60 × 60', 'Structured', TRAVERTINE[3], INTERIOR[12], 'Ichkaridagi tabiiy ranglarni terrassaga olib chiqadigan tosh talqini.'],
  ['quarzite-outdoor-20', 'Terrazza Sand 20', 'outdoor', 'Outside / Inside', '60 × 120', 'Structured', TRAVERTINE[4], INTERIOR[13], 'Issiq qum rangi va tosh tuzilishi. Hovli hamda ochiq makon konsepsiyalari uchun.'],
]

export const products = entries.map(([slug, name, category, collection, size, finish, image, interior, description], index) => ({
  id: index + 1, slug, name, category, collection, size, finish, image,
  images: [image, interior],
  description, thickness: category === 'outdoor' ? '20 mm' : '9 mm',
  origin: 'Namuna kolleksiya', year: '2026', mock: true,
  featured: [0, 2, 12, 13].includes(index), span: index % 3 === 0 ? 'wide' : 'base',
}))
export const productBySlug = slug => products.find(product => product.slug === slug)
export const productsByCategory = slug => !slug || slug === 'all' ? products : products.filter(product => product.category === slug)
export const featuredProducts = products.filter(product => product.featured)
export const countByCategory = slug => productsByCategory(slug).length
export function relatedProducts(product, limit = 3) {
  if (!product) return []
  return products.filter(item => item.id !== product.id).sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0, limit)
}
export default products
