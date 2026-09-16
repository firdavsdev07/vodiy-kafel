import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useHasSession } from './hooks';

/**
 * Sessiya yo'q / tugadi → kirish sahifasi, qaytish manzili saqlanadi (D-007).
 * Refresh rad etilsa token store tozalanadi va shu komponent darhol yo'naltiradi.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const hasSession = useHasSession();
  const location = useLocation();

  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}
