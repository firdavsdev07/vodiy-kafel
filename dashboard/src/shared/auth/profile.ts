import type { Schema } from '@/shared/api/types';

type GeneratedProfile = Schema<'UserProfileResponseDto'>;

export type StaffRole = GeneratedProfile['role'];

/**
 * ⚠ VAQTINCHALIK (api B-059): openapi.json da `string | null` maydonlar
 * `Record<string, never>` bo'lib chiqyapti. B-059 tuzatilgach
 * `StaffProfile = GeneratedProfile` bo'ladi va bu override o'chiriladi.
 */
export type StaffProfile = Omit<GeneratedProfile, 'email' | 'branchId' | 'telegramUsername'> & {
  email: string | null;
  /** SUPER_ADMIN da `null` — barcha filiallar. */
  branchId: string | null;
  telegramUsername: string | null;
};
