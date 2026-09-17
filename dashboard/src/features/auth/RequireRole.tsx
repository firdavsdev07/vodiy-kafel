import type { ReactNode } from 'react';
import ForbiddenPage from '@/pages/forbidden/ForbiddenPage';
import type { StaffRole } from '@/shared/auth';
import { PageLoading } from '@/shared/ui/PageLoading';
import { profileErrorMessage, roleAccess } from './access';
import { useProfile } from './hooks';

/**
 * Roli yetmasa — 403 sahifasi (D-007). Rol `GET /auth/me` dan olinadi.
 * ⚠ G4: faqat UX — backend baribir `@Roles(...)` bilan tekshiradi.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: readonly StaffRole[];
  children: ReactNode;
}) {
  const profile = useProfile();

  switch (roleAccess({ role: profile.data?.role, isError: profile.isError }, roles)) {
    case 'allowed':
      return children;
    case 'forbidden':
      return <ForbiddenPage />;
    case 'loading':
      return <PageLoading />;
    case 'error':
      return (
        <div role="alert" className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
          <p className="text-muted">{profileErrorMessage(profile.error)}</p>
          <button
            type="button"
            onClick={() => void profile.refetch()}
            disabled={profile.isFetching}
            className="rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-60"
          >
            Qayta urinish
          </button>
        </div>
      );
  }
}
