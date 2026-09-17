import { env } from '@/shared/config/env';
import { ApiError } from './api-error';
import type {
  ApiPath,
  BodyOf,
  DataOf,
  HttpMethod,
  Meta,
  PathParamsOf,
  PathsWith,
  QueryOf,
} from './types';

/**
 * Yupqa `fetch` wrapper (D-004) — og'ir generatsiya qilingan klient EMAS.
 *
 *   const page = await api.get('/admin/products', { query: { page: 1 } });
 *   //    ^ PaginatedProductAdminResponseDtoDto — `{ data }` allaqachon ochilgan (G3)
 *
 * ⚠ `branchId`/`role` hech qachon tanaga qo'lda qo'shilmaydi (G5) — token
 *   ichida keladi.
 */

type HasPathParams<P extends string> = P extends `${string}{${string}}${string}` ? true : false;

type RequestOptions<P extends ApiPath, M extends HttpMethod> = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
} & ([QueryOf<P, M>] extends [never] ? { query?: never } : { query?: QueryOf<P, M> }) &
  (HasPathParams<P> extends true
    ? { params: PathParamsOf<P, M> }
    : { params?: never }) &
  (M extends 'get' | 'delete'
    ? { body?: never }
    : // multipart endpointlar (fayl yuklash) OpenAPI'da tanasiz tasvirlangan — FormData doim ruxsat
      { body?: ([BodyOf<P, M>] extends [never] ? never : BodyOf<P, M>) | FormData });

/** Ikkinchi argument majburiy faqat yo'lda `{id}` bo'lganda. */
type OptionsArg<P extends ApiPath, M extends HttpMethod> =
  HasPathParams<P> extends true
    ? [options: RequestOptions<P, M>]
    : [options?: RequestOptions<P, M>];

export interface WithMeta<T> {
  data: T;
  meta: Meta | undefined;
}

export interface DownloadedFile {
  blob: Blob;
  filename: string | undefined;
}

interface RawOptions {
  query?: object;
  params?: object;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export interface ApiClientConfig {
  baseUrl: string;
  fetch?: typeof fetch;
  getAccessToken?: () => string | null | undefined;
  /**
   * 401 kelganda tokenni yangilash (D-006). `true` — yangilandi, so'rov
   * BIR MARTA qayta yuboriladi. Parallel 401 larni bitta refreshga
   * birlashtirish — shu funksiya zimmasida (session.ts).
   */
  refreshAccessToken?: () => Promise<boolean>;
  /** Fayl yuklash (progress) uchun — testda soxta XHR beriladi. */
  createXhr?: () => XMLHttpRequest;
}

export interface UploadOptions {
  signal?: AbortSignal;
  /** 0…1 — yuborilgan qism (server javobini kutish bunga kirmaydi) */
  onProgress?: (fraction: number) => void;
}

/**
 * Kirish yo'llari: 401 — "parol noto'g'ri"/"refresh yaroqsiz", refresh
 * urinilmaydi va (eskirgan) access token yuborilmaydi.
 */
const AUTH_ENTRY_PATHS = new Set(['/auth/admin/login', '/auth/refresh']);

export function buildUrl(
  baseUrl: string,
  path: string,
  params?: object,
  query?: object,
): string {
  const resolved = path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = (params as Record<string, unknown> | undefined)?.[name];
    if (value === undefined || value === null || value === '') {
      throw new Error(`API yo‘li "${path}" uchun "${name}" parametri berilmagan`);
    }
    return encodeURIComponent(String(value));
  });

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    // Bo'sh filtr yuborilmaydi — backend `search=` ni "bo'sh qidiruv" deb o'qimasin
    if (value === undefined || value === null || value === '') continue;
    const values: unknown[] = Array.isArray(value) ? value : [value];
    for (const item of values) search.append(key, String(item));
  }
  const qs = search.toString();
  return `${baseUrl}${resolved === '/' ? '' : resolved}${qs ? `?${qs}` : ''}`;
}

export function parseFilename(contentDisposition: string | null): string | undefined {
  if (!contentDisposition) return undefined;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (star?.[1]) return decodeURIComponent(star[1]);
  return /filename="?([^";]+)"?/i.exec(contentDisposition)?.[1];
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('json')) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function createApiClient(config: ApiClientConfig) {
  const doFetch = config.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  async function send(method: HttpMethod, path: string, options: RawOptions = {}) {
    const url = buildUrl(config.baseUrl, path, options.params, options.query);
    const isAuthEntry = AUTH_ENTRY_PATHS.has(path);

    const attempt = async () => {
      const headers = new Headers(options.headers);
      const token = isAuthEntry ? null : config.getAccessToken?.();
      if (token) headers.set('Authorization', `Bearer ${token}`);

      let body: BodyInit | undefined;
      if (options.body instanceof FormData) {
        body = options.body; // Content-Type (boundary) ni brauzer qo'yadi
      } else if (options.body !== undefined) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(options.body);
      }

      try {
        return await doFetch(url, {
          method: method.toUpperCase(),
          headers,
          body,
          signal: options.signal,
        });
      } catch (cause) {
        // Bekor qilingan so'rov (TanStack Query) — xato EMAS, o'zgartirmay o'tkaziladi
        if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
        throw ApiError.network(cause);
      }
    };

    return withAuthRetry(attempt, isAuthEntry);
  }

  /** 401 → refresh → so'rov BIR MARTA qayta; javob ok bo'lmasa ApiError. fetch ham, XHR ham shu yerdan. */
  async function withAuthRetry(attempt: () => Promise<Response>, isAuthEntry: boolean) {
    let response = await attempt();
    if (
      response.status === 401 &&
      config.refreshAccessToken &&
      !isAuthEntry &&
      (await config.refreshAccessToken())
    ) {
      response = await attempt();
    }

    if (!response.ok) throw ApiError.fromResponse(response, await readBody(response));
    return response;
  }

  /**
   * `fetch` yuklash jarayonini bermaydi — fayl uchun XHR. Natija `Response`
   * ga aylantiriladi, qolgani (refresh, xato formati) oddiy so'rov bilan bir xil.
   */
  function xhrAttempt(url: string, body: FormData, options: UploadOptions) {
    return () =>
      new Promise<Response>((resolve, reject) => {
        // Yuborilmagan XHR da abort() hech qanday hodisa chiqarmaydi — promise osilib qolardi
        if (options.signal?.aborted) {
          reject(new DOMException('Yuklash bekor qilindi', 'AbortError'));
          return;
        }
        const xhr = (config.createXhr ?? (() => new XMLHttpRequest()))();
        xhr.open('POST', url);
        const token = config.getAccessToken?.();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) options.onProgress?.(event.loaded / event.total);
        };
        xhr.onload = () =>
          resolve(
            new Response(xhr.status === 204 ? null : xhr.responseText, {
              status: xhr.status,
              headers: { 'content-type': xhr.getResponseHeader('content-type') ?? '' },
            }),
          );
        xhr.onerror = () => reject(ApiError.network(new Error('XHR error')));
        xhr.onabort = () => reject(new DOMException('Yuklash bekor qilindi', 'AbortError'));
        options.signal?.addEventListener('abort', () => xhr.abort(), { once: true });
        xhr.send(body);
      });
  }

  async function json(method: HttpMethod, path: string, options?: RawOptions) {
    const payload = await readBody(await send(method, path, options));
    if (typeof payload === 'object' && payload !== null && 'data' in payload) {
      const { data, meta } = payload as { data: unknown; meta?: Meta };
      return { data, meta };
    }
    return { data: undefined, meta: undefined };
  }

  const data =
    <M extends HttpMethod>(method: M) =>
    async <P extends PathsWith<M>>(path: P, ...[options]: OptionsArg<P, M>) =>
      (await json(method, path, options as RawOptions)).data as DataOf<P, M>;

  return {
    get: data('get'),
    post: data('post'),
    put: data('put'),
    patch: data('patch'),
    delete: data('delete'),

    /** `meta` kerak bo'lganda — o'ram ochiladi, lekin `meta` yo'qolmaydi. */
    async getWithMeta<P extends PathsWith<'get'>>(
      path: P,
      ...[options]: OptionsArg<P, 'get'>
    ): Promise<WithMeta<DataOf<P, 'get'>>> {
      const result = await json('get', path, options as RawOptions);
      return result as WithMeta<DataOf<P, 'get'>>;
    },

    /** Fayl yuklash (multipart) — yuklash jarayoni `onProgress` orqali (D-013). */
    async upload<P extends PathsWith<'post'>>(
      path: P,
      options: { body: FormData } & UploadOptions &
        (HasPathParams<P> extends true ? { params: PathParamsOf<P, 'post'> } : { params?: never }),
    ): Promise<DataOf<P, 'post'>> {
      const url = buildUrl(config.baseUrl, path, options.params);
      const response = await withAuthRetry(xhrAttempt(url, options.body, options), false);
      const payload = await readBody(response);
      return (typeof payload === 'object' && payload !== null && 'data' in payload
        ? (payload as { data: unknown }).data
        : undefined) as DataOf<P, 'post'>;
    },

    /** Fayl (PDF) — `{ data }` o'rami yo'q, Blob qaytadi. */
    async download<P extends PathsWith<'get'>>(
      path: P,
      ...[options]: OptionsArg<P, 'get'>
    ): Promise<DownloadedFile> {
      const response = await send('get', path, options as RawOptions);
      return {
        blob: await response.blob(),
        filename: parseFilename(response.headers.get('content-disposition')),
      };
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;

interface AuthHooks {
  getAccessToken: () => string | null | undefined;
  refreshAccessToken: () => Promise<boolean>;
}

let authHooks: AuthHooks = {
  getAccessToken: () => null,
  refreshAccessToken: async () => false,
};

/** app/ qatlami (auth-wiring.ts) token va refreshni shu yerga ulaydi. */
export function setAuthHooks(hooks: AuthHooks): void {
  authHooks = hooks;
}

export const api = createApiClient({
  baseUrl: env.apiUrl,
  getAccessToken: () => authHooks.getAccessToken(),
  refreshAccessToken: () => authHooks.refreshAccessToken(),
});
