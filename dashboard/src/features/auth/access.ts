import { ApiError } from '@/shared/api';
import type { StaffRole } from '@/shared/auth';
import { hasRole } from '@/shared/lib/permissions';

export type RoleAccess = 'loading' | 'error' | 'allowed' | 'forbidden';

/**
 * Bo'limga kirish qarori (D-007). Rol ma'lum bo'lsa — faqat rol hal qiladi
 * (fon refetch xatosi ochiq sahifani yopmaydi). Rol noma'lum: xato → 'error',
 * aks holda 'loading' — profil kelmaguncha 403 ham, sahifa ham ko'rsatilmaydi.
 */
export function roleAccess(
  profile: { role: StaffRole | undefined; isError: boolean },
  roles: readonly StaffRole[],
): RoleAccess {
  if (profile.role) return hasRole(profile.role, roles) ? 'allowed' : 'forbidden';
  return profile.isError ? 'error' : 'loading';
}

/** `/auth/me` yuklanmasa — xodimga ko'rsatiladigan matn. */
export function profileErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return error.message;
    const id = error.requestId ? ` (ID: ${error.requestId})` : '';
    return `Profilni yuklab bo‘lmadi${id}.`;
  }
  return 'Profilni yuklab bo‘lmadi.';
}
