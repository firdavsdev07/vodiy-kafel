/**
 * Muhit sozlamalari — yagona joy. Kodda `import.meta.env` to'g'ridan-to'g'ri
 * ISHLATILMAYDI: noto'g'ri yoki yo'q qiymat dastur ochilganda darhol aniq
 * xato bo'lib chiqsin (so'rovlar jimgina `undefined/admin/...` ga ketmasin).
 */
export interface AppEnv {
  /** Backend bazasi, oxirida `/` siz: `http://localhost:3000/api/v1` */
  apiUrl: string;
}

export function parseEnv(raw: Record<string, string | undefined>): AppEnv {
  const apiUrl = raw.VITE_API_URL?.trim();
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

  return { apiUrl: apiUrl.replace(/\/+$/, '') };
}

export const env: AppEnv = parseEnv(import.meta.env);
