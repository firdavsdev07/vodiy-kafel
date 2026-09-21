/**
 * Schema.org ma'lumotlari (S-039).
 *
 * JSON-LD tanlandi (microdata emas): u JSX'ga aralashmaydi, bitta
 * `<script>` ichida turadi va dizaynga umuman tegmaydi.
 *
 * ⚠ React `<script>` ni `<head>` ga KO'CHIRMAYDI (u faqat `title`,
 *   `meta`, `link` ni ko'chiradi). Shart ham emas: JSON-LD `<body>`
 *   ichida ham to'liq yaroqli.
 *
 * ⚠ `dangerouslySetInnerHTML` — boshqa yo'l yo'q: React `<script>`
 *   ichidagi matnni bolalar sifatida qo'ymaydi. Kiritilayotgan narsa
 *   BIZNING obyektimiz, `JSON.stringify` dan o'tadi; pastdagi
 *   `</script>` himoyasi esa matn ichidan chiqib ketishni to'sadi.
 */
export default function JsonLd({ data }) {
  if (!data) return null

  const json = JSON.stringify(data).replace(/</g, '\\u003c')

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
