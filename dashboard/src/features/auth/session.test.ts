import { describe, expect, it } from 'vitest';
import { tokenStore } from '@/shared/auth';
import { queryClient } from '@/shared/query';
import { wireAuth } from './session';

describe('🔒 chiqishda kesh tozalanadi (D-048)', () => {
  it('sessiya tugashi bilan TanStack keshi (so‘rovlar ham, mutatsiyalar ham) bo‘shaydi', async () => {
    wireAuth();
    tokenStore.setTokens({ accessToken: 'a', refreshToken: 'r' });
    queryClient.setQueryData(['admin', 'customers', 'detail', 'c1'], { companyName: 'Oldingi xodim ko‘rgan mijoz' });
    await queryClient.getMutationCache().build(queryClient, { mutationFn: async () => 'parol' }).execute(undefined);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(1);
    expect(queryClient.getMutationCache().getAll()).toHaveLength(1);

    tokenStore.clear(); // chiqish yoki refresh rad etilgani

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    expect(tokenStore.hasSession()).toBe(false);
  });
});
