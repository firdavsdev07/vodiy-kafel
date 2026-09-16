import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TokenPayload } from '../../common/types/token-payload';
import { PasswordChangeRequiredGuard } from './password-change-required.guard';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

/** `request.user` si berilgan soxta ExecutionContext. */
const contextWith = (user?: Partial<TokenPayload>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  }) as unknown as ExecutionContext;

describe('RolesGuard (B-017)', () => {
  const guardRequiring = (roles: string[] | undefined) =>
    new RolesGuard({
      getAllAndOverride: () => roles,
    } as unknown as Reflector);

  describe('🔒 metama’lumot qayerdan (haqiqiy Reflector)', () => {
    @Roles('SUPER_ADMIN', 'BRANCH_ADMIN')
    class ClassLevel {
      list() {}
      @Roles('SUPER_ADMIN')
      strict() {}
    }
    const guard = new RolesGuard(new Reflector());
    const method = (name: 'list' | 'strict') =>
      Object.getOwnPropertyDescriptor(ClassLevel.prototype, name)
        ?.value as () => void;
    const ctx = (handler: () => void, role: string) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ user: { type: 'USER', role } }),
        }),
        getHandler: () => handler,
        getClass: () => ClassLevel,
      }) as unknown as ExecutionContext;

    it('klass darajasidagi @Roles ishlaydi — MANAGER rad etiladi', () => {
      // Regressiya (B-043): avval faqat metod o'qilib, bu endpoint ochiq edi.
      expect(guard.canActivate(ctx(method('list'), 'MANAGER'))).toBe(false);
      expect(guard.canActivate(ctx(method('list'), 'BRANCH_ADMIN'))).toBe(true);
    });

    it('metod darajasidagi @Roles klassnikidan ustun', () => {
      expect(guard.canActivate(ctx(method('strict'), 'BRANCH_ADMIN'))).toBe(
        false,
      );
    });
  });

  it('rol talab qilinmasa — o‘tkazadi', () => {
    expect(guardRequiring(undefined).canActivate(contextWith({}))).toBe(true);
  });

  it('mos rol — o‘tkazadi', () => {
    const guard = guardRequiring(['SUPER_ADMIN', 'BRANCH_ADMIN']);
    expect(
      guard.canActivate(contextWith({ type: 'USER', role: 'BRANCH_ADMIN' })),
    ).toBe(true);
  });

  it('boshqa rol — rad etadi', () => {
    const guard = guardRequiring(['SUPER_ADMIN']);
    expect(
      guard.canActivate(contextWith({ type: 'USER', role: 'MANAGER' })),
    ).toBe(false);
  });

  it('🔒 ROLSIZ payload (optom mijoz tokeni) — rad etadi', () => {
    // Mijozda `role` umuman yo'q. Agar guard buni e'tiborsiz qoldirsa,
    // mijoz xodim endpointlariga kirib ketardi.
    const guard = guardRequiring(['SUPER_ADMIN', 'BRANCH_ADMIN', 'MANAGER']);
    expect(
      guard.canActivate(contextWith({ type: 'CUSTOMER', sub: 'customer-1' })),
    ).toBe(false);
  });

  it('token umuman yo‘q — rad etadi', () => {
    expect(guardRequiring(['SUPER_ADMIN']).canActivate(contextWith())).toBe(
      false,
    );
  });
});

describe('PasswordChangeRequiredGuard (B-017)', () => {
  const guard = new PasswordChangeRequiredGuard();

  it('vaqtinchalik parol almashtirilgan — o‘tkazadi', () => {
    expect(
      guard.canActivate(
        contextWith({ type: 'CUSTOMER', mustChangePassword: false }),
      ),
    ).toBe(true);
  });

  it('🔒 vaqtinchalik parol hali kuchda — 403', () => {
    expect(() =>
      guard.canActivate(
        contextWith({ type: 'CUSTOMER', mustChangePassword: true }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('xodim tokeniga taalluqli emas — o‘tkazadi', () => {
    expect(
      guard.canActivate(contextWith({ type: 'USER', role: 'MANAGER' })),
    ).toBe(true);
  });
});
