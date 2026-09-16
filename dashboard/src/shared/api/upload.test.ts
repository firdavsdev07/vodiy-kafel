import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import { createApiClient } from './client';

const BASE = 'http://api.test/api/v1';

type Reply = { status: number; body?: unknown } | 'network';

/** Soxta XHR: har yuborishda navbatdagi javob; progress hodisalarini chiqaradi. */
function fakeXhr(replies: Reply[]) {
  const sent: { url: string; headers: Record<string, string>; body: unknown }[] = [];
  class FakeXhr {
    status = 0;
    responseText = '';
    upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    private url = '';
    private headers: Record<string, string> = {};
    open(_method: string, url: string) {
      this.url = url;
    }
    setRequestHeader(k: string, v: string) {
      this.headers[k] = v;
    }
    getResponseHeader() {
      return 'application/json';
    }
    private sentFlag = false;
    // Haqiqiy XHR kabi: yuborilmagan so'rovda abort() hodisa CHIQARMAYDI
    abort() {
      if (this.sentFlag) this.onabort?.();
    }
    send(body: unknown) {
      this.sentFlag = true;
      sent.push({ url: this.url, headers: this.headers, body });
      const reply = replies.shift();
      queueMicrotask(() => {
        if (!reply || reply === 'network') return this.onerror?.();
        this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 } as ProgressEvent);
        this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 } as ProgressEvent);
        this.status = reply.status;
        this.responseText = reply.body === undefined ? '' : JSON.stringify(reply.body);
        this.onload?.();
      });
    }
  }
  return { sent, createXhr: () => new FakeXhr() as unknown as XMLHttpRequest };
}

const form = () => {
  const f = new FormData();
  f.append('type', 'IMAGE');
  return f;
};

describe('api.upload (D-013)', () => {
  it('token, progress, { data } ochiladi', async () => {
    const xhr = fakeXhr([{ status: 201, body: { data: { id: 'm1' } } }]);
    const client = createApiClient({ baseUrl: BASE, getAccessToken: () => 't1', createXhr: xhr.createXhr });
    const progress: number[] = [];
    const result = await client.upload('/admin/products/{id}/media', {
      params: { id: 'p 1' },
      body: form(),
      onProgress: (f) => progress.push(f),
    });
    expect(result).toEqual({ id: 'm1' });
    expect(progress).toEqual([0.5, 1]);
    expect(xhr.sent[0]?.url).toBe(`${BASE}/admin/products/p%201/media`);
    expect(xhr.sent[0]?.headers.Authorization).toBe('Bearer t1');
  });

  it('401 → refresh → BIR MARTA qayta yuboriladi (yangi token bilan)', async () => {
    let token = 'old';
    const xhr = fakeXhr([{ status: 401, body: { statusCode: 401, message: 'x', error: 'Unauthorized' } }, { status: 201, body: { data: { id: 'm2' } } }]);
    const refresh = vi.fn(async () => {
      token = 'new';
      return true;
    });
    const client = createApiClient({ baseUrl: BASE, getAccessToken: () => token, refreshAccessToken: refresh, createXhr: xhr.createXhr });
    await expect(client.upload('/admin/products/{id}/media', { params: { id: 'p' }, body: form() })).resolves.toEqual({ id: 'm2' });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(xhr.sent.map((s) => s.headers.Authorization)).toEqual(['Bearer old', 'Bearer new']);
  });

  it('backend xatosi → ApiError (matn va requestId bilan); tarmoq xatosi', async () => {
    const xhr = fakeXhr([
      { status: 400, body: { statusCode: 400, message: 'Fayl turi mos emas', error: 'Bad Request', requestId: 'r-1' } },
      'network',
    ]);
    const client = createApiClient({ baseUrl: BASE, createXhr: xhr.createXhr });
    const bad = await client.upload('/admin/products/{id}/media', { params: { id: 'p' }, body: form() }).catch((e: unknown) => e);
    expect(bad).toBeInstanceOf(ApiError);
    expect((bad as ApiError).messages).toEqual(['Fayl turi mos emas']);
    expect((bad as ApiError).requestId).toBe('r-1');
    const net = await client.upload('/admin/products/{id}/media', { params: { id: 'p' }, body: form() }).catch((e: unknown) => e);
    expect((net as ApiError).isNetworkError).toBe(true);
  });

  it('yuklash davomida bekor qilish — AbortError', async () => {
    const xhr = fakeXhr([{ status: 201, body: { data: {} } }]);
    const client = createApiClient({ baseUrl: BASE, createXhr: xhr.createXhr });
    const controller = new AbortController();
    const pending = client.upload('/admin/products/{id}/media', { params: { id: 'p' }, body: form(), signal: controller.signal });
    controller.abort();
    const error = await pending.catch((e: unknown) => e);
    expect((error as DOMException).name).toBe('AbortError');
  });

  it('oldindan bekor qilingan signal — so‘rov umuman ketmaydi, promise osilib qolmaydi', async () => {
    const xhr = fakeXhr([]);
    const client = createApiClient({ baseUrl: BASE, createXhr: xhr.createXhr });
    const controller = new AbortController();
    controller.abort();
    const error = await client
      .upload('/admin/products/{id}/media', { params: { id: 'p' }, body: form(), signal: controller.signal })
      .catch((e: unknown) => e);
    expect((error as DOMException).name).toBe('AbortError');
  });
});
