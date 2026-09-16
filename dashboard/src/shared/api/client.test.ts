import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { ApiError } from './api-error';
import { buildUrl, createApiClient, parseFilename } from './client';

const BASE = 'http://api.test/api/v1';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
}

function setup(response: Response | (() => Promise<Response>), token?: string) {
  const fetchMock = vi.fn<typeof fetch>(async () =>
    typeof response === 'function' ? response() : response,
  );
  const client = createApiClient({ baseUrl: BASE, fetch: fetchMock, getAccessToken: () => token });
  const call = () => {
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    return { url: String(url), init: init ?? {}, headers: new Headers(init?.headers) };
  };
  return { client, fetchMock, call };
}

describe('buildUrl', () => {
  it('path parametrlari kodlanadi, bo‘sh query tashlanadi, massiv takrorlanadi', () => {
    expect(
      buildUrl(BASE, '/admin/products/{id}', { id: 'a b/c' }, {
        page: 2,
        search: '',
        factoryId: undefined,
        isActive: false,
        ids: ['x', 'y'],
      }),
    ).toBe(`${BASE}/admin/products/a%20b%2Fc?page=2&isActive=false&ids=x&ids=y`);
  });

  it('parametr berilmasa — tushunarli xato', () => {
    expect(() => buildUrl(BASE, '/admin/products/{id}')).toThrow(/"id"/);
  });
});

describe('parseFilename', () => {
  it('oddiy va UTF-8 shakllar', () => {
    expect(parseFilename('attachment; filename="shartnoma-12.pdf"')).toBe('shartnoma-12.pdf');
    expect(parseFilename("attachment; filename*=UTF-8''shartnoma%20%E2%84%961.pdf")).toBe(
      'shartnoma №1.pdf',
    );
    expect(parseFilename(null)).toBeUndefined();
  });
});

describe('api klient', () => {
  it('{ data } o‘ramini ochadi va Bearer token qo‘yadi', async () => {
    const { client, call } = setup(jsonResponse({ data: { id: 'u1' } }), 'tok');
    const me = await client.get('/auth/me');
    expect(me).toEqual({ id: 'u1' });
    expect(call().url).toBe(`${BASE}/auth/me`);
    expect(call().headers.get('Authorization')).toBe('Bearer tok');
  });

  it('token yo‘q — Authorization sarlavhasi yo‘q', async () => {
    const { client, call } = setup(jsonResponse({ data: null }));
    await client.get('/settings/public');
    expect(call().headers.has('Authorization')).toBe(false);
  });

  it('getWithMeta — meta yo‘qolmaydi', async () => {
    const meta = { total: 3 };
    const { client } = setup(jsonResponse({ data: { items: [] }, meta }));
    await expect(client.getWithMeta('/admin/products')).resolves.toEqual({
      data: { items: [] },
      meta,
    });
  });

  it('POST tanasi JSON bo‘lib ketadi', async () => {
    const { client, call } = setup(jsonResponse({ data: { accessToken: 'a' } }, { status: 201 }));
    await client.post('/auth/admin/login', { body: { phone: '+998901234567', password: 'x' } });
    expect(call().init.method).toBe('POST');
    expect(call().headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(call().init.body))).toEqual({
      phone: '+998901234567',
      password: 'x',
    });
  });

  it('FormData — Content-Type qo‘lda qo‘yilmaydi', async () => {
    const { client, call } = setup(jsonResponse({ data: {} }, { status: 201 }));
    const form = new FormData();
    form.append('title', 'x');
    await client.post('/admin/products/{id}/media', { params: { id: 'p1' }, body: form });
    expect(call().init.body).toBe(form);
    expect(call().headers.has('Content-Type')).toBe(false);
  });

  it('204 — undefined qaytadi', async () => {
    const { client } = setup(new Response(null, { status: 204 }));
    await expect(
      client.post('/products/{slug}/view', { params: { slug: 'yongxin-60' } }),
    ).resolves.toBeUndefined();
  });

  it('PDF — Blob va fayl nomi', async () => {
    const { client } = setup(
      new Response(new Blob(['%PDF-1.4']), {
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="c.pdf"',
        },
      }),
    );
    const file = await client.download('/wholesale/contracts/{id}/download', { params: { id: 'c1' } });
    expect(file.filename).toBe('c.pdf');
    expect(await file.blob.text()).toBe('%PDF-1.4');
  });

  it('xato javobi → ApiError (statusCode, messages, requestId)', async () => {
    const { client } = setup(
      jsonResponse(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: ['pallets must not be less than 1', 'name should not be empty'],
          path: '/api/v1/admin/products',
          timestamp: '2026-09-16T10:00:00.000Z',
          requestId: 'req-1',
        },
        { status: 400 },
      ),
    );
    const error = await client.get('/admin/products').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      statusCode: 400,
      messages: ['pallets must not be less than 1', 'name should not be empty'],
      requestId: 'req-1',
    });
  });

  it('JSON bo‘lmagan xato ham yo‘qolmaydi, requestId sarlavhadan', async () => {
    const { client } = setup(
      new Response('<html>Bad gateway</html>', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'content-type': 'text/html', 'x-request-id': 'req-2' },
      }),
    );
    await expect(client.get('/auth/me')).rejects.toMatchObject({
      statusCode: 502,
      messages: ['Bad Gateway'],
      requestId: 'req-2',
    });
  });

  it('tarmoq xatosi → statusCode 0; bekor qilish → AbortError o‘zgarmaydi', async () => {
    const offline = setup(() => Promise.reject(new TypeError('Failed to fetch')));
    const error = await offline.client.get('/auth/me').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isNetworkError).toBe(true);

    const abort = new DOMException('aborted', 'AbortError');
    const aborted = setup(() => Promise.reject(abort));
    await expect(aborted.client.get('/auth/me')).rejects.toBe(abort);
  });

  it('turlar: noto‘g‘ri yo‘l / metod / parametrsiz chaqiruv — TYPE xatosi', () => {
    const { client } = setup(jsonResponse({ data: null }));
    const typeOnly = () => {
      // @ts-expect-error — bunday yo'l yo'q
      void client.get('/admin/prodcts');
      // @ts-expect-error — /auth/me da POST yo'q
      void client.post('/auth/me');
      // @ts-expect-error — {id} parametri majburiy
      void client.get('/admin/products/{id}');
      // @ts-expect-error — sortBy ro'yxatida yo'q qiymat
      void client.get('/admin/products', { query: { sortBy: 'price' } });
      // To'g'ri query QABUL qilinadi (D-011 da topilgan: ixtiyoriy `query?` avval `never` edi)
      void client.get('/admin/products', { query: { sortBy: 'name', page: 2, isActive: true } });
      // @ts-expect-error — isActive boolean, satr emas
      void client.get('/admin/products', { query: { isActive: 'true' } });
    };
    expect(typeOnly).toBeTypeOf('function');
    expectTypeOf<Awaited<ReturnType<typeof client.get<'/admin/products'>>>>().toHaveProperty('items');
    expectTypeOf<Awaited<ReturnType<typeof client.get<'/admin/products'>>>>().not.toBeAny();
  });

  it('401 → BITTA refresh (parallel so‘rovlar birlashadi) → qayta yuboriladi', async () => {
    let token = 'old';
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) =>
      new Headers(init?.headers).get('Authorization') === 'Bearer new'
        ? jsonResponse({ data: { ok: true } })
        : jsonResponse({ statusCode: 401, message: 'x', error: 'Unauthorized' }, { status: 401 }),
    );
    let inflight: Promise<boolean> | null = null;
    const refresh = vi.fn(() => {
      inflight ??= Promise.resolve().then(() => {
        token = 'new';
        return true;
      });
      return inflight;
    });
    const client = createApiClient({
      baseUrl: BASE,
      fetch: fetchMock,
      getAccessToken: () => token,
      refreshAccessToken: refresh,
    });

    const results = await Promise.all([
      client.get('/auth/me'),
      client.get('/settings/public'),
      client.get('/admin/products'),
    ]);
    expect(results).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(new Set(refresh.mock.results.map((r) => r.value)).size).toBe(1);
  });

  it('refresh muvaffaqiyatsiz → 401 xatosi chiqadi; login/refresh da refresh urinilmaydi', async () => {
    const unauthorized = () =>
      jsonResponse({ statusCode: 401, message: 'x', error: 'Unauthorized' }, { status: 401 });
    const refresh = vi.fn(async () => false);
    const client = createApiClient({
      baseUrl: BASE,
      fetch: vi.fn<typeof fetch>(async () => unauthorized()),
      refreshAccessToken: refresh,
    });
    await expect(client.get('/auth/me')).rejects.toMatchObject({ statusCode: 401 });
    expect(refresh).toHaveBeenCalledTimes(1);

    await expect(
      client.post('/auth/admin/login', { body: { phone: '+998900000001', password: 'x' } }),
    ).rejects.toMatchObject({ statusCode: 401 });
    await expect(
      client.post('/auth/refresh', { body: { refreshToken: 'r' } }),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('login/refresh ga eskirgan access token yuborilmaydi', async () => {
    const { client, call } = setup(jsonResponse({ data: {} }), 'stale');
    await client.post('/auth/refresh', { body: { refreshToken: 'r' } });
    expect(call().headers.has('Authorization')).toBe(false);
  });
});
