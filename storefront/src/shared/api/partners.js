import { assetUrl } from './config.js'
import { useApiQuery } from './useApiQuery.js'

/**
 * Hamkorlar — `GET /partners` (S-026).
 *
 * Faqat faol hamkorlar, admin belgilagan tartibda (server shu tartibda
 * beradi, sayt qayta saralamaydi).
 */

export function usePartners() {
  return useApiQuery('/partners')
}

/**
 * `PartnerPublicDto` → sahifa shakli.
 *
 * `logoUrl` sxemada majburiy, lekin amalda yuklanmasligi mumkin
 * (fayl o'chgan, CDN javob bermadi). Shuning uchun logotip
 * KO'RSATILMASA nima bo'lishini `PartnerLogo` hal qiladi — bu yerda
 * shunchaki manzil to'liq holga keltiriladi.
 */
export function partnerModel(dto) {
  return {
    id: dto.id,
    name: dto.name,
    logo: assetUrl(dto.logoUrl),
    websiteUrl: dto.websiteUrl || null,
  }
}
