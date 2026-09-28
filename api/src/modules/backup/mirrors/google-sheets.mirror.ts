import type { BackupTable } from '../backup-table';
import type { BackupMirror } from './backup-mirror.interface';
import type { GoogleServiceAccount } from './google-service-account';

const API = 'https://sheets.googleapis.com/v4/spreadsheets';
/** Bitta `values:batchUpdate` so'rovining taxminiy chegarasi (Google ~10 MB qabul qiladi). */
const MAX_PAYLOAD_CHARS = 4_000_000;

interface SheetProperties {
  sheetId: number;
  title: string;
}

/** `'jadval'!A1` — nomdagi apostrof ikkilanadi (A1 notatsiyasi qoidasi). */
export const sheetRange = (title: string) => `'${title.replace(/'/g, "''")}'`;

/**
 * Google Sheets (`BACKUP_PROVIDER=google`): har jadval — shu nomli varaq.
 *
 * Har yozishda:
 *   1. yo'q varaqlar qo'shiladi;
 *   2. varaq o'lchami aynan ma'lumotga moslanadi (o'chirilgan qatorlar
 *      qolib ketmasin), 1-qator (ustun nomlari) qotiriladi;
 *   3. eski qiymatlar tozalanadi va yangisi `RAW` yoziladi — telefon
 *      `+998…` formula yoki son bo'lib ketmaydi, pul satr bo'lib qoladi.
 * Bazada yo'q bo'lib ketgan jadvalning varag'iga tegilmaydi.
 */
export class GoogleSheetsMirror implements BackupMirror {
  readonly target: string;

  constructor(
    private readonly spreadsheetId: string,
    private readonly account: GoogleServiceAccount,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.target = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  }

  async write(tables: BackupTable[]): Promise<void> {
    const sheets = await this.ensureSheets(tables.map((t) => t.name));

    await this.call(':batchUpdate', {
      requests: tables.map((table) => ({
        updateSheetProperties: {
          properties: {
            sheetId: sheets.get(table.name),
            gridProperties: {
              // +2: sarlavha va bitta bo'sh qator — qotirilgan qator bilan
              // bo'sh jadvalda ham "barcha qator qotirilgan" xatosi bo'lmasin.
              rowCount: table.rows.length + 2,
              columnCount: Math.max(table.columns.length, 1),
              frozenRowCount: 1,
            },
          },
          fields: 'gridProperties(rowCount,columnCount,frozenRowCount)',
        },
      })),
    });

    await this.call('/values:batchClear', {
      ranges: tables.map((t) => sheetRange(t.name)),
    });

    for (const data of this.chunks(tables)) {
      await this.call('/values:batchUpdate', { valueInputOption: 'RAW', data });
    }
  }

  /** Varaq nomi → `sheetId`; yo'qlari yaratiladi. */
  private async ensureSheets(names: string[]): Promise<Map<string, number>> {
    const meta = (await this.call(
      '?fields=sheets.properties(sheetId,title)',
      undefined,
      'GET',
    )) as {
      sheets?: { properties: SheetProperties }[];
    };
    const ids = new Map(
      (meta.sheets ?? []).map((s) => [
        s.properties.title,
        s.properties.sheetId,
      ]),
    );
    const missing = names.filter((name) => !ids.has(name));
    if (missing.length > 0) {
      const added = (await this.call(':batchUpdate', {
        requests: missing.map((title) => ({
          addSheet: { properties: { title } },
        })),
      })) as { replies: { addSheet: { properties: SheetProperties } }[] };
      for (const reply of added.replies) {
        ids.set(
          reply.addSheet.properties.title,
          reply.addSheet.properties.sheetId,
        );
      }
    }
    return ids;
  }

  /** Katta jadval bir nechta so'rovga bo'linadi (qatorlar bo'yicha). */
  private *chunks(tables: BackupTable[]) {
    let data: { range: string; values: unknown[][] }[] = [];
    let size = 0;
    const flush = () => {
      const out = data;
      data = [];
      size = 0;
      return out;
    };

    for (const table of tables) {
      const all = [
        table.columns,
        ...table.rows.map((row) => row.map((c) => c ?? '')),
      ];
      let start = 0;
      while (start < all.length) {
        let end = start;
        let chunkSize = 0;
        while (
          end < all.length &&
          (end === start || size + chunkSize < MAX_PAYLOAD_CHARS)
        ) {
          chunkSize += JSON.stringify(all[end]).length;
          end++;
        }
        data.push({
          range: `${sheetRange(table.name)}!A${start + 1}`,
          values: all.slice(start, end),
        });
        size += chunkSize;
        start = end;
        if (size >= MAX_PAYLOAD_CHARS) yield flush();
      }
    }
    if (data.length > 0) yield flush();
  }

  private async call(
    path: string,
    body: unknown,
    method: 'GET' | 'POST' = 'POST',
  ): Promise<unknown> {
    const token = await this.account.token();
    const response = await this.fetchImpl(
      `${API}/${this.spreadsheetId}${path}`,
      {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
    const json = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    if (!response.ok) {
      const hint =
        response.status === 403 || response.status === 404
          ? ' — Spreadsheet service account email’iga "Editor" qilib ulashilganini tekshiring'
          : '';
      throw new Error(
        `Google Sheets xatosi (${response.status}): ${json.error?.message ?? 'noma’lum'}${hint}`,
      );
    }
    return json;
  }
}
