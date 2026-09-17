/**
 * Muhit sozlamalari — yagona joy. Kodda `import.meta.env` to'g'ridan-to'g'ri
 * ISHLATILMAYDI: noto'g'ri yoki yo'q qiymat dastur ochilganda darhol aniq
 * xato bo'lib chiqsin (so'rovlar jimgina `undefined/admin/...` ga ketmasin).
 */
export interface AppEnv {
  /** Backend bazasi, oxirida `/` siz: `http://localhost:3000/api/v1` */
  apiUrl: string;
  /**
   * Dev rejimi (`vite dev`). FAQAT ishlab chiqish qulayliklari uchun —
   * masalan mock to'lovni simulyatsiya qilish tugmasi (D-055). Backendda
   * ham `/dev/*` endpointlari faqat `NODE_ENV=development` da ro'yxatdan
   * o'tadi, ya'ni productionda tugma bosilsa ham 404 bo'lardi.
   */
  dev: boolean;
}

export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const rawUrl = raw.VITE_API_URL;
  const apiUrl = typeof rawUrl === 'string' ? rawUrl.trim() : undefined;
  if (!apiUrl) {
    throw new Error(
      'VITE_API_URL berilmagan — dashboard/.env.example dan .env yarating',
    );
  }

  let url: URL;
  try {
    url = new URL(apiUrl);
  } catch {
    throw new Error(`VITE_API_URL noto‘g‘ri manzil: ${apiUrl}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`VITE_API_URL http(s) bo‘lishi kerak: ${apiUrl}`);
  }

  return { apiUrl: apiUrl.replace(/\/+$/, ''), dev: raw.DEV === true || raw.DEV === 'true' };
}

export const env: AppEnv = parseEnv(import.meta.env);
