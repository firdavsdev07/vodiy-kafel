import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api';
import { profileErrorMessage, roleAccess } from './access';

const admins = ['SUPER_ADMIN', 'BRANCH_ADMIN'] as const;

describe('roleAccess (D-007)', () => {
  it('rol mos → allowed, mos emas → forbidden', () => {
    expect(roleAccess({ role: 'BRANCH_ADMIN', isError: false }, admins)).toBe('allowed');
    expect(roleAccess({ role: 'MANAGER', isError: false }, admins)).toBe('forbidden');
  });

  it('profil kelmaguncha — 403 ham, sahifa ham emas', () => {
    expect(roleAccess({ role: undefined, isError: false }, admins)).toBe('loading');
  });

  it('profil yuklanmadi → error; keshdagi rol bo‘lsa fon xatosi sahifani yopmaydi', () => {
    expect(roleAccess({ role: undefined, isError: true }, admins)).toBe('error');
    expect(roleAccess({ role: 'SUPER_ADMIN', isError: true }, admins)).toBe('allowed');
    expect(roleAccess({ role: 'MODERATOR', isError: true }, admins)).toBe('forbidden');
  });

  it('xato matni: tarmoq, requestId', () => {
    expect(profileErrorMessage(ApiError.network(new Error('x')))).toMatch(/aloqa yo‘q/);
    expect(
      profileErrorMessage(
        new ApiError({ statusCode: 500, messages: ['boom'], error: 'x', requestId: 'req-1' }),
      ),
    ).toBe('Profilni yuklab bo‘lmadi (ID: req-1).');
    expect(profileErrorMessage(new Error('x'))).toBe('Profilni yuklab bo‘lmadi.');
  });
});
