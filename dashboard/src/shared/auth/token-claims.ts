/**
 * Token ichidagi da'volarni o'qish (D-050).
 *
 * ⚠ G4 — BU FAQAT UX. Imzo TEKSHIRILMAYDI va tekshirilmasligi kerak ham:
 *   token bizga serverdan keldi, bu yerda uni "ishonchli" deb emas,
 *   shunchaki "qulay" deb o'qiymiz. Har qanday himoya backendda —
 *   `mustChangePassword: true` bo'lsa u boshqa hamma endpointga 403 beradi.
 *
 * Nega kerak: `mustChangePassword` faqat KIRISH javobida keladi va
 * `GET /auth/me` mijozga 401 qaytaradi (api B-065 shuni tuzatadi).
 * Ya'ni sahifa yangilangandan keyin bu bayroqni boshqa hech qayerdan
 * bilib bo'lmaydi — token ichidan o'qimasak, mijoz kabinetga kirib
 * qoladi va har bir so'rovda 403 ko'radi.
 */
interface TokenClaims {
  mustChangePassword?: boolean;
}

function decodeClaims(token: string | null): TokenClaims | null {
  if (!token) return null;
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    // JWT base64url — atob standart base64 kutadi
    const json = atob(payload.replaceAll('-', '+').replaceAll('_', '/'));
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === 'object' && parsed !== null ? (parsed as TokenClaims) : null;
  } catch {
    return null; // buzilgan token — bayroq yo'q deb hisoblaymiz, backend baribir to'sadi
  }
}

/** Vaqtinchalik parol hali almashtirilmaganmi (D-050). */
export function mustChangePassword(token: string | null): boolean {
  return decodeClaims(token)?.mustChangePassword === true;
}
