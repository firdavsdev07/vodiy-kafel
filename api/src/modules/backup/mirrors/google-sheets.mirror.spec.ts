import { createVerify, generateKeyPairSync } from 'node:crypto';
import { GoogleServiceAccount } from './google-service-account';
import { GoogleSheetsMirror, sheetRange } from './google-sheets.mirror';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

type Call = { url: string; method: string; body: unknown };

/** Google'ning soxta javoblari — har so'rov yoziladi. */
function fakeGoogle(
  existing: string[] = [],
  fail?: { status: number; message: string },
) {
  const calls: Call[] = [];
  const impl = ((
    input: string | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = String(input);
    const body: unknown =
      typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
    calls.push({ url, method: init?.method ?? 'GET', body });
    const json = (status: number, data: unknown) =>
      Promise.resolve({
        ok: status < 400,
        status,
        json: () => Promise.resolve(data),
      } as Response);

    if (url.includes('oauth2'))
      return json(200, { access_token: 'tok', expires_in: 3600 });
    if (fail) return json(fail.status, { error: { message: fail.message } });
    if (init?.method === 'GET') {
      return json(200, {
        sheets: existing.map((title, i) => ({
          properties: { sheetId: i, title },
        })),
      });
    }
    if (
      url.endsWith(':batchUpdate') &&
      (body as { requests?: { addSheet?: unknown }[] }).requests?.[0]?.addSheet
    ) {
      const requests = (
        body as { requests: { addSheet: { properties: { title: string } } }[] }
      ).requests;
      return json(200, {
        replies: requests.map((r, i) => ({
          addSheet: {
            properties: {
              sheetId: 100 + i,
              title: r.addSheet.properties.title,
            },
          },
        })),
      });
    }
    return json(200, {});
  }) as typeof fetch;
  return { calls, impl };
}

describe('GoogleServiceAccount', () => {
  it('JWT RS256 bilan imzolanadi va kalit bilan tekshiriladi', () => {
    const account = new GoogleServiceAccount(
      'bot@x.iam.gserviceaccount.com',
      PEM,
      fetch,
      () => 1_000_000,
    );
    const [header, claims, signature] = account.assertion().split('.');
    const payload: unknown = JSON.parse(
      Buffer.from(claims, 'base64url').toString(),
    );
    expect(payload).toMatchObject({
      iss: 'bot@x.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      iat: 1000,
      exp: 4600,
    });
    const ok = createVerify('RSA-SHA256')
      .update(`${header}.${claims}`)
      .verify(publicKey, Buffer.from(signature, 'base64url'));
    expect(ok).toBe(true);
  });

  it('token keshlanadi', async () => {
    const google = fakeGoogle();
    const account = new GoogleServiceAccount('bot@x', PEM, google.impl);
    await account.token();
    await account.token();
    expect(google.calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(
      1,
    );
  });

  it('noto‘g‘ri kalit — ishga tushishda aniq xato', () => {
    expect(() => new GoogleServiceAccount('bot@x', 'not-a-key')).toThrow(
      /PRIVATE_KEY/,
    );
  });
});

describe('GoogleSheetsMirror', () => {
  const tables = [
    { name: '_holat', columns: ['Jadval'], rows: [['orders']] },
    {
      name: "o'rders",
      columns: ['id', 'phone', 'note'],
      rows: [['o1', '+998901234567', null]],
    },
  ];

  it('yo‘q varaq qo‘shiladi, o‘lcham moslanadi, tozalanadi, RAW yoziladi', async () => {
    const google = fakeGoogle(['_holat']);
    const mirror = new GoogleSheetsMirror(
      'SHEET',
      new GoogleServiceAccount('bot@x', PEM, google.impl),
      google.impl,
    );
    await mirror.write(tables);

    const api = google.calls.filter((c) =>
      c.url.includes('sheets.googleapis.com'),
    );
    expect(
      api.map((c) => `${c.method} ${c.url.replace(/.*SHEET/, '')}`),
    ).toEqual([
      'GET ?fields=sheets.properties(sheetId,title)',
      'POST :batchUpdate',
      'POST :batchUpdate',
      'POST /values:batchClear',
      'POST /values:batchUpdate',
    ]);
    expect(api[1].body).toEqual({
      requests: [{ addSheet: { properties: { title: "o'rders" } } }],
    });
    const layout = (
      api[2].body as {
        requests: {
          updateSheetProperties?: { properties: unknown };
          repeatCell?: unknown;
          autoResizeDimensions?: { dimensions: unknown };
          setBasicFilter?: unknown;
        }[];
      }
    ).requests;
    expect(layout[8].updateSheetProperties?.properties).toEqual({
      sheetId: 100,
      gridProperties: {
        rowCount: 3,
        columnCount: 3,
        frozenRowCount: 1,
        hideGridlines: true,
      },
    });
    expect(layout.filter((request) => request.repeatCell)).toHaveLength(4);
    expect(
      layout.filter((request) => request.autoResizeDimensions),
    ).toHaveLength(2);
    expect(layout[4].autoResizeDimensions?.dimensions).toEqual({
      sheetId: 0,
      dimension: 'ROWS',
      startIndex: 1,
      endIndex: 3,
    });
    expect(layout.filter((request) => request.setBasicFilter)).toHaveLength(2);
    expect(api[3].body).toEqual({ ranges: ["'_holat'", "'o''rders'"] });
    expect(api[4].body).toEqual({
      valueInputOption: 'RAW',
      data: [
        { range: "'_holat'!A1", values: [['Jadval'], ['orders']] },
        {
          range: "'o''rders'!A1",
          values: [
            ['id', 'phone', 'note'],
            ['o1', '+998901234567', ''],
          ],
        },
      ],
    });
    expect(mirror.target).toBe('https://docs.google.com/spreadsheets/d/SHEET');
  });

  it('403 — ulashish haqida maslahat bilan xato', async () => {
    const google = fakeGoogle([], {
      status: 403,
      message: 'The caller does not have permission',
    });
    const mirror = new GoogleSheetsMirror(
      'SHEET',
      new GoogleServiceAccount('bot@x', PEM, google.impl),
      google.impl,
    );
    await expect(mirror.write(tables)).rejects.toThrow(
      /403.*permission.*Editor/,
    );
  });

  it('sheetRange apostrofni ikkilaydi', () => {
    expect(sheetRange("a'b")).toBe("'a''b'");
  });
});
