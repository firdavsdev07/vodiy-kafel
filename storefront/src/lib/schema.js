import { SITE_URL } from './site.js'

/**
 * Schema.org obyektlarini yasovchi funksiyalar (S-039).
 *
 * Komponentdan (`src/components/ui/JsonLd.jsx`) ATAYLAB ajratilgan:
 * bu toza funksiyalar, React'ga aloqasi yo'q — testdan ham shu yerda
 * o'tkaziladi.
 */

/** Sayt bo'ylab bitta: kompaniya. */

export function organizationSchema({ company, branches = [] }) {
  const main = branches[0]

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: company.name,
    legalName: company.legalName,
    url: SITE_URL,
    // Kichik nusxa — asl `logo.png` 1.45 MB (S-042).
    image: `${SITE_URL}/images/logo-512.png`,
    description: company.intro,
    telephone: company.contact.phoneHref.map((phone) => `+${phone.replace(/\D/g, '')}`),
    email: company.contact.email,
    sameAs: [company.contact.telegram, company.contact.instagram].filter(Boolean),
    ...(main
      ? {
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'UZ',
            addressLocality: main.city,
            streetAddress: main.address,
          },
          // Ish vaqti bizda ERKIN MATN (`"Du–Sh 09:00–18:00"`), Schema.org
          // esa `Mo-Sa 09:00-18:00` kutadi. Noto'g'ri formatdagi qiymat
          // berishdan ko'ra, odam o'qiydigan matnni berish afzal.
          openingHours: main.workingHours,
        }
      : null),
    // Har bir do'kon — alohida joy.
    ...(branches.length > 1
      ? {
          department: branches.slice(1).map((branch) => ({
            '@type': 'LocalBusiness',
            name: `${company.name} — ${branch.city}`,
            address: {
              '@type': 'PostalAddress',
              addressCountry: 'UZ',
              addressLocality: branch.city,
              streetAddress: branch.address,
            },
            telephone: branch.phones.map((phone) => phone.href),
          })),
        }
      : null),
  }
}

/**
 * Mahsulot.
 *
 * 🔒 `Offer` da NARX YO'Q — ochiq saytda narx ko'rsatilmaydi (G1).
 *    Bu normal holat: `availability` beriladi, `price` esa
 *    berilmaydi. Yolg'on narx yozishdan ko'ra, maydonni umuman
 *    bermagan to'g'ri.
 */
export function productSchema(product, { image } = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    sku: product.id,
    ...(image ? { image } : null),
    ...(product.color ? { color: product.color } : null),
    ...(product.factory?.name ? { brand: { '@type': 'Brand', name: product.factory.name } } : null),
    ...(product.size?.label
      ? { size: product.size.label, material: 'Keramogranit' }
      : { material: 'Keramogranit' }),
    offers: {
      '@type': 'Offer',
      availability:
        product.availability === 'AVAILABLE'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/catalog/${product.slug}`,
      // Narx yo'q, lekin valyuta ham yozilmaydi: ikkalasi birga
      // bo'lmasa Google "to'liq bo'lmagan Offer" deb ogohlantiradi,
      // bu esa xato emas — ataylab shunday.
    },
  }
}

/** Navigatsiya zanjiri — qidiruv natijasida yo'l ko'rinadi. */
export function breadcrumbSchema(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  }
}

/** Galereya — rasmlar to'plami. */
export function gallerySchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: 'Bajarilgan ishlar',
    url: `${SITE_URL}/gallery`,
    image: items
      .filter((item) => item.image)
      .map((item) => ({
        '@type': 'ImageObject',
        contentUrl: item.image,
        name: item.title || undefined,
      })),
  }
}
