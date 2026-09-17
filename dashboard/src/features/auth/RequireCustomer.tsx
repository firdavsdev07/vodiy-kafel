import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useActorType, useCustomerProfile, useHasSession, useMustChangePassword } from './hooks';

/**
 * Kabinet marshrutlari — faqat optom mijoz sessiyasi bilan (D-049).
 *
 * Ikki xil rad etish, ikki xil manzil:
 *   • sessiya umuman yo'q  → `/kabinet/kirish` (qaytish manzili saqlanadi)
 *   • sessiya XODIMniki    → `/` (xodim bosh sahifasi). Uni kabinet kirish
 *     sahifasiga yuborish xato bo'lardi: u allaqachon kirgan, faqat boshqa
 *     eshikdan.
 *   • vaqtinchalik parol  → `/kabinet/parol` (D-050). Backend bu holatda
 *     boshqa hamma endpointga 403 beradi, ya'ni kabinetni ko'rsatish
 *     foydasiz — sahifa ochiladi-yu, hamma so'rov xato bilan qaytadi.
 *
 * Bayroq IKKI manbadan (D-051 da qo'shildi):
 *   1. refresh token ichidagi da'vo — DARHOL, sahifa chizilishidan oldin
 *   2. `GET /me/profile` — HAQIQIY holat, javob kelgandan keyin
 * Ikkinchisi kerak, chunki admin mijozga yangi vaqtinchalik parol bergan
 * bo'lsa (`/admin/customers/:id/reset-password`), qo'ldagi eski tokendagi
 * da'vo hamon `false` turadi: mijoz kabinetga kirib, har bir so'rovda 403
 * ko'rardi. Profil javobi shu holatni tuzatadi.
 *
 * ⚠ G4: bu FAQAT UX. Backend baribir `CustomerOnlyGuard` bilan tekshiradi —
 *   xodim tokeni bilan `/me/*` ga so'rov ketsa 403 qaytadi.
 */
export function RequireCustomer({ children }: { children: ReactNode }) {
  const hasSession = useHasSession();
  const actorType = useActorType();
  const claimSaysMustChange = useMustChangePassword();
  const profile = useCustomerProfile();
  const needsNewPassword = claimSaysMustChange || profile.data?.mustChangePassword === true;
  const location = useLocation();

  if (!hasSession) {
    return (
      <Navigate
        to="/kabinet/kirish"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  if (actorType !== 'customer') return <Navigate to="/" replace />;
  if (needsNewPassword) return <Navigate to="/kabinet/parol" replace />;
  return children;
}
