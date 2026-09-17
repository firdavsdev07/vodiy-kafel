import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * `openapi.json` — frontend bilan SHARTNOMA (CLAUDE.md G6). Bu test uni
 * yolg'on gapirib qo'yishidan qo'riqlaydi (B-059).
 *
 * Muammo nimada edi: TypeScript `emitDecoratorMetadata` union tur uchun
 * `design:type` ni `Object` deb beradi. Ya'ni `email!: string | null`
 * dekoratorda aniq `type:` bo'lmasa, hujjatga `type: object` bo'lib tushadi
 * va `openapi-typescript` undan `Record<string, never>` yasaydi —
 * frontend `profile.email` ni satr sifatida o'qiy olmaydi.
 *
 * ⚠ Bu test `openapi.json` faylini o'qiydi, uni QAYTA GENERATSIYA QILMAYDI.
 * DTO o'zgargach `pnpm openapi:export` chaqirilishi shart — aks holda test
 * eski faylni tekshiradi.
 */
describe('openapi.json — shartnoma yaxlitligi', () => {
  interface SchemaObject {
    type?: string;
    properties?: Record<string, SchemaObject>;
    additionalProperties?: unknown;
    allOf?: unknown[];
    $ref?: string;
    required?: string[];
  }

  const document = JSON.parse(
    readFileSync(resolve(__dirname, '../../openapi.json'), 'utf-8'),
  ) as { components: { schemas: Record<string, SchemaObject> } };

  const schemas = document.components.schemas;

  /**
   * Ataylab erkin JSON — bu yerda `type: object` TO'G'RI.
   * Sozlama qiymati kalitga qarab son, satr yoki obyekt bo'ladi;
   * bildirishnoma `payload` esa turiga qarab har xil.
   */
  const ERKIN_JSON = new Set([
    'SettingPublicDto.value',
    'SettingAdminDto.value',
    'UpdateSettingDto.value',
    'NotificationDto.payload',
  ]);

  it('hech bir maydon turini yo‘qotmagan (xossasiz `type: object` yo‘q)', () => {
    const yoqotganlar: string[] = [];

    for (const [schemaName, schema] of Object.entries(schemas)) {
      for (const [prop, value] of Object.entries(schema.properties ?? {})) {
        const kalit = `${schemaName}.${prop}`;
        if (ERKIN_JSON.has(kalit)) continue;

        // `allOf` bo'lsa — ichida `$ref` bor, tur YO'QOLMAGAN.
        // Nest nullable DTO havolasini aynan shunday yozadi va
        // `openapi-typescript` uni to'g'ri o'qiydi.
        const turYoq =
          value.type === 'object' &&
          value.properties === undefined &&
          value.additionalProperties === undefined &&
          value.allOf === undefined &&
          value.$ref === undefined;

        if (turYoq) yoqotganlar.push(kalit);
      }
    }

    expect(yoqotganlar).toEqual([]);
  });

  it('erkin JSON maydonlar ro‘yxati eskirmagan', () => {
    // Ro'yxatdagi maydon bazadan olib tashlansa — ro'yxat ham tozalansin,
    // aks holda u kelajakdagi haqiqiy xatoni yashirib qo'yadi.
    for (const kalit of ERKIN_JSON) {
      const [schemaName, prop] = kalit.split('.');
      expect(schemas[schemaName]?.properties?.[prop]).toBeDefined();
    }
  });
});
