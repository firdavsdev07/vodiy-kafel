import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useActorType, useHasSession } from './hooks';

/**
 * XODIM marshrutlari (D-007, D-049 da aktor tekshiruvi qo'shildi).
 *
 * Sessiya yo'q / tugadi → kirish sahifasi, qaytish manzili saqlanadi.
 * Refresh rad etilsa token store tozalanadi va shu komponent darhol yo'naltiradi.
 *
 * Sessiya MIJOZniki bo'lsa → kabinetga. Uni `/login` ga yuborish xato
 * bo'lardi: u allaqachon kirgan, shunchaki boshqa eshikdan.
 *
 * ⚠ G4: faqat UX. Backend `RolesGuard` bilan o'zi tekshiradi.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const hasSession = useHasSession();
  const actorType = useActorType();
  const location = useLocation();

  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (actorType === 'customer') return <Navigate to="/kabinet" replace />;
  return children;
}
