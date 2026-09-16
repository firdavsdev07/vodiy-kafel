import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { createQueryClient, setUnauthorizedHandler, shouldRetry } from './query-client';
import { queryKeys } from './query-keys';

const apiError = (statusCode: number) =>
  new ApiError({ statusCode, messages: ['x'], error: 'x' });

describe('shouldRetry', () => {
  it('4xx — qayta urinilmaydi', () => {
    for (const code of [400, 401, 403, 404, 409, 422]) {
      expect(shouldRetry(0, apiError(code))).toBe(false);
    }
  });

  it('5xx va tarmoq — 2 martagacha', () => {
    expect(shouldRetry(0, apiError(500))).toBe(true);
    expect(shouldRetry(1, apiError(503))).toBe(true);
    expect(shouldRetry(2, apiError(503))).toBe(false);
    expect(shouldRetry(0, ApiError.network(new TypeError('Failed to fetch')))).toBe(true);
  });

  it('kod xatosi — takrorlanmaydi', () => {
    expect(shouldRetry(0, new TypeError('x is undefined'))).toBe(false);
  });
});

describe('queryKeys', () => {
  it('ierarxiya: list/detail `all` prefiksi bilan boshlanadi', () => {
    const { products } = queryKeys;
    expect(products.list({ page: 2 })).toEqual(['admin', 'products', 'list', { page: 2 }]);
    expect(products.detail('p1')).toEqual(['admin', 'products', 'detail', 'p1']);
    expect(products.list({}).slice(0, 2)).toEqual([...products.all]);
    expect(products.detail('p1').slice(0, 3)).toEqual([...products.details()]);
  });

  it('domenlar kesishmaydi', () => {
    const roots = Object.values(queryKeys).map((k) => JSON.stringify('all' in k ? k.all : k));
    expect(new Set(roots).size).toBe(roots.length);
  });
});

describe('createQueryClient', () => {
  it('mutation meta.invalidates — tegishli querylar eskirgan bo‘ladi', async () => {
    const client = createQueryClient();
    client.setQueryData(queryKeys.orders.list({ page: 1 }), { items: [] });
    client.setQueryData(queryKeys.productStocks.detail('s1'), { qty: 5 });
    client.setQueryData(queryKeys.customers.detail('c1'), { id: 'c1' });

    await client
      .getMutationCache()
      .build(client, {
        mutationFn: async () => 'ok',
        meta: { invalidates: [queryKeys.orders.all, queryKeys.productStocks.all] },
      })
      .execute(undefined);

    const state = (key: readonly unknown[]) => client.getQueryState(key)?.isInvalidated;
    expect(state(queryKeys.orders.list({ page: 1 }))).toBe(true);
    expect(state(queryKeys.productStocks.detail('s1'))).toBe(true);
    expect(state(queryKeys.customers.detail('c1'))).toBe(false);
  });

  it('401 — global handler chaqiriladi, 403 — yo‘q', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const client = createQueryClient();

    for (const code of [401, 403]) {
      await client
        .fetchQuery({
          queryKey: ['test', code],
          queryFn: () => Promise.reject(apiError(code)),
        })
        .catch(() => {});
    }
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ statusCode: 401 });
    setUnauthorizedHandler(() => {});
  });
});
