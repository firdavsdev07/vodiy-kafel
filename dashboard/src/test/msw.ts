import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { ApiPath, DataOf, HttpMethod, PathsWith } from '@/shared/api/types';
import { env } from '@/shared/config/env';

/**
 * MSW — komponent testlari uchun soxta backend (D-045).
 *
 * 🛡 Handler'lar `schema.d.ts` turlaridan: `data` javobi haqiqiy shartnomaga
 *    (`DataOf<yo'l, metod>`) mos kelmasa — test KOMPILYATSIYA bo'lmaydi
 *    (`pnpm build` → `tsc -b`, tsconfig.test.json). Mock backenddan jimgina
 *    chetlashib keta olmaydi.
 */
export const server = setupServer();

/** `/admin/orders/{id}` → `http://…/api/v1/admin/orders/:id` */
const url = (path: ApiPath) => `${env.apiUrl}${path.replace(/\{(\w+)\}/g, ':$1')}`;

type Reply<P extends ApiPath, M extends HttpMethod> = DataOf<P, M> | ((request: Request) => DataOf<P, M> | Promise<DataOf<P, M>>);

function handler<M extends HttpMethod>(method: M) {
  return <P extends PathsWith<M> & ApiPath>(path: P, reply: Reply<P, M>) =>
    http[method](url(path), async ({ request }) =>
      HttpResponse.json({ data: typeof reply === 'function' ? await (reply as (r: Request) => unknown)(request) : reply }),
    );
}

export const mockApi = {
  get: handler('get'),
  post: handler('post'),
  put: handler('put'),
  patch: handler('patch'),
  delete: handler('delete'),
};

/** Backend xato formati (G3) — `{ statusCode, error, message, path, timestamp, requestId }`. */
export function apiError<M extends HttpMethod>(method: M, path: ApiPath, statusCode: number, message: string) {
  return http[method](url(path), ({ request }) =>
    HttpResponse.json(
      { statusCode, error: 'Error', message, path: new URL(request.url).pathname, timestamp: new Date().toISOString(), requestId: 'test-request-id' },
      { status: statusCode },
    ),
  );
}
