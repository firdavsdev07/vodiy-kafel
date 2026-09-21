import { assetUrl } from './config.js'
import { useApiQuery } from './useApiQuery.js'

/**
 * Filiallar — ochiq saytning manzil manbai (S-025).
 *
 * ⚠ `GET /branches` FAQAT `RETAIL` do'konlarni qaytaradi — markaziy
 *   ombor mijozga KO'RINMAYDI (api/CLAUDE.md §5). Shuning uchun saytda
 *   "filial turi" degan tushuncha UMUMAN yo'q: bu yerda kelgan hamma
 *   narsa — odam borib ko'ra oladigan do'kon.
 *
 * Tartib — admin belgilagan `sortOrder`, server shu tartibda beradi.
 * Ya'ni "asosiy" filial = ro'yxatdagi birinchisi, va uni saytdan emas,
 * admin panelidan o'zgartiriladi.
 */

/** Hamma do'kon. */
export function useBranches() {
  return useApiQuery('/branches')
}

/**
 * Bitta manzil kerak bo'lgan joylar uchun (Footer, Menyu, "Biz
 * haqimizda", bosh sahifadagi showroom bloki) — ro'yxatdagi birinchisi.
 */
export function useMainBranch() {
  const query = useBranches()
  return { ...query, data: query.data?.length ? branchModel(query.data[0]) : undefined }
}

/**
 * Xarita havolasi.
 *
 * ❓ Xarita PROVAYDERI hali tanlanmagan (api 10-savol: Yandex / 2GIS),
 *   shuning uchun sahifaga xarita O'RNATILMAGAN: tashqi skript ham,
 *   iframe ham yo'q. Havola koordinatadan yasaladi va telefonda
 *   odamning o'z xarita ilovasini ochadi.
 *
 * Qaror qabul qilinganda O'ZGARADIGAN YAGONA JOY — shu funksiya.
 */
export function mapLink(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

/**
 * O'zbek raqamini o'qish uchun ajratadi: `+998730000010` →
 * `+998 73 000 00 10`. Boshqa formatdagi raqam TEGILMAYDI — noto'g'ri
 * "chiroyli" ko'rinish raqamni buzganidan ko'ra, borini ko'rsatgan afzal.
 */
export function formatPhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (digits.length !== 12 || !digits.startsWith('998')) return String(raw ?? '')
  const [, code, a, b, c] = digits.match(/^998(\d{2})(\d{3})(\d{2})(\d{2})$/)
  return `+998 ${code} ${a} ${b} ${c}`
}

/**
 * `BranchPublicDto` → sahifa ishlatadigan shakl.
 *
 * Telefon ikki ko'rinishda kerak: ekranda ajratilgan, `tel:` da esa
 * faqat raqam — brauzer bo'shliqli raqamni ba'zan terolmaydi.
 */
export function branchModel(dto) {
  return {
    id: dto.id,
    name: dto.name,
    city: dto.city,
    address: dto.address,
    workingHours: dto.workingHours,
    phones: (dto.phones ?? []).map((phone) => ({
      display: formatPhone(phone),
      href: String(phone).replace(/[^\d+]/g, ''),
    })),
    image: assetUrl(dto.buildingImageUrl),
    telegramUrl: dto.telegramUrl ?? null,
    instagramUrl: dto.instagramUrl ?? null,
    mapUrl: mapLink(dto.latitude, dto.longitude),
    // Bosh sahifadagi showroom blokida ko'rsatiladi.
    coordinates:
      typeof dto.latitude === 'number' && typeof dto.longitude === 'number'
        ? `${dto.latitude} / ${dto.longitude}`
        : null,
  }
}
