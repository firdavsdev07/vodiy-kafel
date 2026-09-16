import type { components, operations, paths } from './schema';

/**
 * `schema.d.ts` ustidan yordamchi turlar (D-004). Generatsiya qilingan fayl
 * QO'LDA TAHRIRLANMAYDI — `pnpm api:types` bilan yangilanadi.
 */
export type Schemas = components['schemas'];
export type Schema<Name extends keyof Schemas> = Schemas[Name];
export type { operations };

/** `VITE_API_URL` allaqachon `/api/v1` bilan tugaydi — yo'llar prefikssiz yoziladi. */
type Prefix = '/api/v1';
type Strip<K> = K extends `${Prefix}${infer Rest}` ? (Rest extends '' ? '/' : Rest) : never;
type Full<P extends string> = P extends '/' ? Prefix : `${Prefix}${P}`;

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
export type ApiPath = Strip<keyof paths>;

type Operation<P extends ApiPath, M extends HttpMethod> =
  Full<P> extends keyof paths ? NonNullable<paths[Full<P>][M]> : never;

/** Shu metod mavjud bo'lgan yo'llar — `api.post('/auth/me')` TYPE xatosi. */
export type PathsWith<M extends HttpMethod> = {
  [P in ApiPath]: [Operation<P, M>] extends [never] ? never : P;
}[ApiPath];

type Params<Op> = Op extends { parameters: infer Ps } ? Ps : never;
type Field<T, K extends string> = T extends Record<K, infer V> ? V : undefined;

export type QueryOf<P extends ApiPath, M extends HttpMethod> = NonNullable<
  Field<Params<Operation<P, M>>, 'query'>
>;
export type PathParamsOf<P extends ApiPath, M extends HttpMethod> = NonNullable<
  Field<Params<Operation<P, M>>, 'path'>
>;
export type BodyOf<P extends ApiPath, M extends HttpMethod> =
  Operation<P, M> extends { requestBody?: { content: { 'application/json': infer B } } }
    ? B
    : never;

type SuccessBody<Op> = Op extends { responses: infer R }
  ? R extends Record<200, { content: { 'application/json': infer B } }>
    ? B
    : R extends Record<201, { content: { 'application/json': infer B } }>
      ? B
      : undefined
  : undefined;

/** `{ data }` o'rami OCHILGANDAN keyingi tur (G3). Tanasiz javob — `undefined`. */
export type DataOf<P extends ApiPath, M extends HttpMethod> =
  SuccessBody<Operation<P, M>> extends { data: infer D } ? D : undefined;

export type Meta = Record<string, unknown>;

/** Sahifalangan ro'yxat (`items/total/page/limit/totalPages`). */
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
