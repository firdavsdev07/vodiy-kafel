import { createPrivateKey, createSign, type KeyObject } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

const base64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64url');

/**
 * Google service account → access token (OAuth 2.0 JWT bearer oqimi).
 *
 * Kutubxonasiz: JWT Node `crypto` bilan RS256 da imzolanadi — `googleapis`
 * paketi (~100 MB) bitta so'rov uchun ortiqcha. Token ~1 soat yashaydi va
 * tugashidan 1 daqiqa oldingacha qayta ishlatiladi.
 */
export class GoogleServiceAccount {
  private readonly key: KeyObject;
  private cached: { token: string; expiresAt: number } | null = null;

  constructor(
    private readonly clientEmail: string,
    privateKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {
    try {
      this.key = createPrivateKey(privateKey);
    } catch {
      // Tez xato: kalit noto'g'ri bo'lsa API ishga tushmaydi (env.schema falsafasi).
      throw new Error(
        'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY o‘qilmadi — JSON kalitdagi ' +
          '`private_key` ni to‘liq (-----BEGIN PRIVATE KEY----- … bilan) qo‘ying',
      );
    }
  }

  /** Imzolangan so'rov (assertion) — test uchun alohida. */
  assertion(): string {
    const iat = Math.floor(this.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(
      JSON.stringify({
        iss: this.clientEmail,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat,
        exp: iat + 3600,
      }),
    );
    const signature = createSign('RSA-SHA256')
      .update(`${header}.${claims}`)
      .sign(this.key);
    return `${header}.${claims}.${base64url(signature)}`;
  }

  async token(): Promise<string> {
    if (this.cached && this.cached.expiresAt - 60_000 > this.now())
      return this.cached.token;

    const response = await this.fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: this.assertion(),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
      error?: string;
    };
    if (!response.ok || !body.access_token) {
      throw new Error(
        `Google kirish rad etildi (${response.status}): ${body.error_description ?? body.error ?? 'noma’lum xato'}`,
      );
    }
    this.cached = {
      token: body.access_token,
      expiresAt: this.now() + (body.expires_in ?? 3600) * 1000,
    };
    return body.access_token;
  }
}
