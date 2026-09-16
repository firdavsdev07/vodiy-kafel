/**
 * JWT token payload (stateless, mobil ilova uchun tayyor).
 * TZ 8.1: Notion 8-bo'limda "Mobil va API" deyiladi.
 *
 * 🔒 Qoida: frontend mobildan yoki brauzerdan kirsa, token har doim
 *   refresh bo'ladi — hech qachon "shu vaqtni olibdi" degan bias yo'q.
 *   Access token 15 minut, refresh 30 kun.
 *
 * ⚠ Access va refresh tokenlar TURLI kalit bilan imzolanadi
 *   (JWT_SECRET / JWT_REFRESH_SECRET) — shuning uchun access token'ni
 *   `/auth/refresh` ga yuborib bo'lmaydi va aksincha.
 */
export interface TokenPayload {
  /** User ID (UUID) — sub claim */
  sub: string;
  /** Xodim yoki mijoz (USER | CUSTOMER) */
  type: 'USER' | 'CUSTOMER';
  /**
   * Rol — FAQAT xodimda (SUPER_ADMIN | MODERATOR | BRANCH_ADMIN | MANAGER).
   *
   * 🔒 Optom mijozda bu maydon YO'Q (undefined) va bu ataylab: mijoz hech
   *   qanday xodim roliga ega emas. `RolesGuard` rolsiz payloadni rad etadi,
   *   shuning uchun mijoz tokeni `@Roles(...)` bilan qulflangan endpointga
   *   hech qachon o'tolmaydi — "CUSTOMER" degan soxta rol o'ylab topilmadi.
   */
  role?: string;
  /**
   * Filial. CLAUDE.md 5-qoidasi: filial HECH QACHON body/query dan
   * olinmaydi — har doim tokendan. SUPER_ADMIN da `null` (barcha filiallar).
   *
   * ⚠ Token ichidagi qiymat kirish paytidagi holat — xodim boshqa filialga
   *   o'tkazilsa, u faqat yangi token olgandan keyin kuchga kiradi.
   *   Shu sababli `/auth/me` va `/auth/refresh` filialni bazadan qayta o'qiydi.
   */
  branchId?: string | null;
  /**
   * FAQAT optom mijozda (B-017): admin bergan vaqtinchalik parol hali
   * almashtirilmagan. `true` bo'lsa `PasswordChangeRequiredGuard` mijozni
   * `/auth/wholesale/change-password` dan boshqa hamma joyga qo'ymaydi.
   *
   * ⚠ Qiymat token ichida — parol almashtirilgach DARHOL yangi juftlik
   *   beriladi, shuning uchun eskirgan `true` uzoq yashamaydi. Har so'rovda
   *   bazaga qaramaslik uchun ataylab shunday.
   */
  mustChangePassword?: boolean;
  /** Kirish vaqti (exp bilan refresh qilinadi) */
  iat?: number;
  /** Tugatish vaqti (15 daq uchun) */
  exp?: number;
}
