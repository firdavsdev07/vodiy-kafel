import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { ApiClient } from '@/shared/api/client';
import { normalizeUzPhone } from './phone';
import { createSession } from './session';
import { ACTOR_TYPE_KEY, createTokenStore, REFRESH_TOKEN_KEY } from './token-store';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

const pair = (n: number) => ({ accessToken: `a${n}`, refreshToken: `r${n}` });
const apiError = (statusCode: number) => new ApiError({ statusCode, messages: ['x'], error: 'x' });

describe('tokenStore', () => {
  it('access — xotirada, refresh — storage da', () => {
    const storage = memoryStorage();
    const store = createTokenStore(storage);
    store.setTokens(pair(1));
    expect(store.getAccessToken()).toBe('a1');
    expect(storage.data.get(REFRESH_TOKEN_KEY)).toBe('r1');
    expect([...storage.data.values()]).not.toContain('a1');
  });

  it('sahifa yangilangandan keyin: refresh bor, access yo‘q → sessiya bor', () => {
    const store = createTokenStore(memoryStorage({ [REFRESH_TOKEN_KEY]: 'r0' }));
    expect(store.hasSession()).toBe(true);
    expect(store.getAccessToken()).toBeNull();
  });

  it('clear — tozalaydi va obunachilarga xabar beradi', () => {
    const storage = memoryStorage();
    const store = createTokenStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);
    store.setTokens(pair(1));
    store.clear();
    store.clear(); // takroriy — xabar yo'q
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.hasSession()).toBe(false);
    expect(storage.data.size).toBe(0);
  });

  it('storage bloklangan bo‘lsa ham ishlaydi', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const store = createTokenStore(broken);
    store.setTokens(pair(1));
    expect(store.hasSession()).toBe(true);
  });
});

function fakeApi(post: (path: string, options?: unknown) => Promise<unknown>) {
  return { post: vi.fn(post) } as unknown as ApiClient & { post: ReturnType<typeof vi.fn> };
}

describe('session', () => {
  it('login → tokenlar saqlanadi', async () => {
    const store = createTokenStore(memoryStorage());
    const api = fakeApi(async () => pair(1));
    await createSession({ api, store }).login({ phone: '+998900000001', password: 'p' });
    expect(api.post).toHaveBeenCalledWith('/auth/admin/login', {
      body: { phone: '+998900000001', password: 'p' },
    });
    expect(store.getAccessToken()).toBe('a1');
  });

  it('parallel refresh — BITTA so‘rov', async () => {
    const store = createTokenStore(memoryStorage({ [REFRESH_TOKEN_KEY]: 'r0' }));
    const api = fakeApi(async () => pair(2));
    const session = createSession({ api, store });
    const results = await Promise.all([session.refresh(), session.refresh(), session.refresh()]);
    expect(results).toEqual([true, true, true]);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/refresh', { body: { refreshToken: 'r0' } });
    expect(store.getAccessToken()).toBe('a2');

    await session.refresh(); // tugagandan keyin — yangi so'rov
    expect(api.post).toHaveBeenCalledTimes(2);
  });

  it('refresh 401 → sessiya tugaydi; tarmoq xatosi → sessiya qoladi', async () => {
    const store = createTokenStore(memoryStorage({ [REFRESH_TOKEN_KEY]: 'r0' }));
    const offline = createSession({
      api: fakeApi(() => Promise.reject(ApiError.network(new TypeError('x')))),
      store,
    });
    await expect(offline.refresh()).resolves.toBe(false);
    expect(store.hasSession()).toBe(true);

    const rejected = createSession({ api: fakeApi(() => Promise.reject(apiError(401))), store });
    await expect(rejected.refresh()).resolves.toBe(false);
    expect(store.hasSession()).toBe(false);
  });

  it('refresh token yo‘q — so‘rov ketmaydi', async () => {
    const api = fakeApi(async () => pair(1));
    await expect(
      createSession({ api, store: createTokenStore(memoryStorage()) }).refresh(),
    ).resolves.toBe(false);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('logout — server xato bersa ham local holat tozalanadi', async () => {
    const store = createTokenStore(memoryStorage());
    store.setTokens(pair(1));
    const api = fakeApi(() => Promise.reject(apiError(500)));
    await createSession({ api, store }).logout();
    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(store.hasSession()).toBe(false);
  });
});

describe('normalizeUzPhone', () => {
  it.each([
    ['90 123 45 67', '+998901234567'],
    ['+998 (90) 123-45-67', '+998901234567'],
    ['998901234567', '+998901234567'],
    ['901234567', '+998901234567'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeUzPhone(input)).toBe(expected);
  });

  it.each(['', '90 123 45', '+7 900 123 45 67', '99890123456789'])('%s → null', (input) => {
    expect(normalizeUzPhone(input)).toBeNull();
  });
});

describe('aktor turi (D-049) — xodim va optom mijoz ajratiladi', () => {
  it('sessiya yo‘q → aktor ham yo‘q', () => {
    expect(createTokenStore(memoryStorage()).getActorType()).toBeNull();
  });

  it('kirishda aktor yoziladi va saqlanadi', () => {
    const storage = memoryStorage();
    const store = createTokenStore(storage);
    store.setTokens(pair(1), 'customer');
    expect(store.getActorType()).toBe('customer');
    expect(storage.data.get(ACTOR_TYPE_KEY)).toBe('customer');
  });

  it('sahifa yangilangandan keyin aktor storage dan tiklanadi', () => {
    const store = createTokenStore(
      memoryStorage({ [REFRESH_TOKEN_KEY]: 'r0', [ACTOR_TYPE_KEY]: 'customer' }),
    );
    expect(store.getActorType()).toBe('customer');
  });

  it('`/auth/refresh` aktorni O‘ZGARTIRMAYDI', () => {
    const store = createTokenStore(memoryStorage());
    store.setTokens(pair(1), 'customer');
    store.setTokens(pair(2)); // refresh — aktor berilmaydi
    expect(store.getActorType()).toBe('customer');
    expect(store.getAccessToken()).toBe('a2');
  });

  it('🔒 ORQAGA MOSLIK: aktor yozilmagan eski sessiya — xodim deb olinadi', () => {
    // D-049 dan oldin kirgan xodimda `ACTOR_TYPE_KEY` yo‘q. `null` qaytsa
    // `useProfile` o‘chib qolardi va panel bo‘sh ko‘rinardi.
    const store = createTokenStore(memoryStorage({ [REFRESH_TOKEN_KEY]: 'r0' }));
    expect(store.getActorType()).toBe('staff');
  });

  it('chiqishda aktor ham tozalanadi', () => {
    const storage = memoryStorage();
    const store = createTokenStore(storage);
    store.setTokens(pair(1), 'customer');
    store.clear();
    expect(store.getActorType()).toBeNull();
    expect(storage.data.get(ACTOR_TYPE_KEY)).toBeUndefined();
  });
});

describe('optom mijoz kirishi (D-049)', () => {
  it('`/auth/wholesale/login` chaqiriladi va aktor `customer` bo‘ladi', async () => {
    const store = createTokenStore(memoryStorage());
    const api = {
      post: vi.fn().mockResolvedValue({ ...pair(1), mustChangePassword: false }),
    } as unknown as ApiClient;
    const session = createSession({ api, store });

    const result = await session.loginWholesale({ login: 'Fargona-Optom', password: 'p' });

    expect(api.post).toHaveBeenCalledWith('/auth/wholesale/login', {
      body: { login: 'Fargona-Optom', password: 'p' },
    });
    expect(store.getActorType()).toBe('customer');
    expect(result.mustChangePassword).toBe(false);
  });

  it('vaqtinchalik parol bayrog‘i qaytariladi (⚠ `/auth/me` mijozga 401 beradi)', async () => {
    const store = createTokenStore(memoryStorage());
    const api = {
      post: vi.fn().mockResolvedValue({ ...pair(1), mustChangePassword: true }),
    } as unknown as ApiClient;
    const session = createSession({ api, store });
    await expect(
      session.loginWholesale({ login: 'x', password: 'p' }),
    ).resolves.toEqual({ mustChangePassword: true });
  });

  it('parol almashgach YANGI tokenlar saqlanadi (eskisi hamon to‘silgan)', async () => {
    const store = createTokenStore(memoryStorage());
    const api = {
      post: vi
        .fn()
        .mockResolvedValueOnce({ ...pair(1), mustChangePassword: true })
        .mockResolvedValueOnce({ ...pair(2), mustChangePassword: false }),
    } as unknown as ApiClient;
    const session = createSession({ api, store });

    await session.loginWholesale({ login: 'x', password: 'temp' });
    await session.changeWholesalePassword({ oldPassword: 'temp', newPassword: 'New123!' });

    expect(store.getAccessToken()).toBe('a2');
    expect(store.getActorType()).toBe('customer');
  });
});
