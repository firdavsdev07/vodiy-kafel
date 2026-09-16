/**
 * INN bo'yicha kompaniya ma'lumotini oluvchi — interfeys ortida
 * (CLAUDE.md qoida 3, B-045).
 *
 * ⚠ Haqiqiy Didox.uz ulanganda — FAQAT shu interfeysni implement qiluvchi
 *   yangi klass yoziladi (`contracts.module` dagi bitta qator). Biznes
 *   servis ("Didox" so'zi kodda B-044 spike yakunlanmaguncha uchramaydi)
 *   qaysi manba ekanini bilmaydi.
 */
export interface CompanyLookupProvider {
  lookup(inn: string): Promise<CompanyData>;
}

/** Shartnomaga kiritiladigan, INN bo'yicha topilgan kompaniya ma'lumoti. */
export interface CompanyData {
  companyName: string;
  director: string;
  address: string;
  /** Ro'yxatdan o'tgan sana — ISO 8601 sana satri. */
  registeredAt: string;
}

/** DI tokeni — `@Inject(COMPANY_LOOKUP_PROVIDER) lookup: CompanyLookupProvider`. */
export const COMPANY_LOOKUP_PROVIDER = Symbol('COMPANY_LOOKUP_PROVIDER');
