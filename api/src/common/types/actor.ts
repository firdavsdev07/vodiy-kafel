import type { TokenPayload } from './token-payload';

/**
 * So'rovni bajarayotgan SUBYEKT — xodim yoki optom mijoz (B-051).
 *
 * `TokenPayload` dan farqi: bu JWT emas, DOMEN tushunchasi. `sub` o'rniga
 * `id`, JWT xizmat maydonlari (`iat`, `exp`) yo'q. Servislar tokenning
 * tuzilishini bilmasin uchun ataylab ajratilgan — ertaga token formati
 * o'zgarsa, faqat shu fayldagi `actorFromToken` tahrirlanadi.
 *
 * ⚠ `branchId` HECH QACHON body yoki query dan olinmaydi (CLAUDE.md qoida 5).
 *   U faqat shu yerga — tokendan — tushadi.
 */
export interface Actor {
  /** Xodim (`users.id`) yoki mijoz (`customers.id`) ID si. */
  id: string;
  /** Xodimmi yoki mijoz. */
  type: 'USER' | 'CUSTOMER';
  /**
   * Xodim roli. Optom mijozda YO'Q — u hech qanday xodim roliga ega emas
   * ([[token-payload]] izohiga qara).
   */
  role?: string;
  /** Biriktirilgan filial. SUPER_ADMIN da `null` — u hammasini ko'radi. */
  branchId?: string | null;
  /** Faqat mijozda: vaqtinchalik parol hali almashtirilmagan (B-017). */
  mustChangePassword?: boolean;
}

/** JWT payload → domen subyekti. */
export const actorFromToken = (payload: TokenPayload): Actor => ({
  id: payload.sub,
  type: payload.type,
  role: payload.role,
  branchId: payload.branchId,
  mustChangePassword: payload.mustChangePassword,
});
