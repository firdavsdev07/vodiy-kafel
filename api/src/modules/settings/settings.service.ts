import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaService } from '../../prisma';
import type { SettingAdminDto, SettingPublicDto } from './dto';
import {
  SETTING_DEFINITIONS,
  SETTING_KEYS,
  type SettingKey,
  type SettingValue,
} from './setting-definitions';

/**
 * Kesh muddati. Yozish shu nusxada keshni darhol yangilaydi; muddat faqat
 * kelajakda bir nechta server nusxasi ishlaganda boshqa nusxalar eskirgan
 * qiymatni qancha vaqt ko'rishi mumkinligini cheklaydi.
 */
export const SETTINGS_CACHE_TTL_MS = 60_000;

interface Row {
  key: string;
  value: Prisma.JsonValue;
  description: string | null;
  isPublic: boolean;
  updatedAt: Date;
}

/**
 * Sozlamalar (B-025, TZ 4-bo'lim) — kesh bilan: kalkulyator va katalog har
 * so'rovda chegaralarni o'qiydi, har safar bazaga borilmaydi.
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  private cache: { rows: Map<string, Row>; loadedAt: number } | null = null;
  /** Bir vaqtda kelgan so'rovlar bazaga BITTA so'rov yuborsin. */
  private loading: Promise<Map<string, Row>> | null = null;
  /**
   * Yozishdan OLDIN boshlangan o'qish yozishdan KEYIN tugasa, eski qiymatni
   * keshga yozib qo'ymasligi uchun: natija faqat avlod o'zgarmagan bo'lsa
   * saqlanadi.
   */
  private generation = 0;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tekshirilgan qiymat. Yozuv yo'q yoki sxemaga mos kelmasa — `fallback`
   * (buzilgan qiymat ogohlantirish bilan logga yoziladi).
   */
  async get<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
    const rows = await this.load();
    return this.valueOf(key, rows.get(key));
  }

  /**
   * Ochiq sozlamalar — bazada `isPublic` bo'lgan va tizim taniydigan
   * kalitlar. Buzilgan qiymat ochiq API'ga chiqmaydi.
   */
  async findPublic(): Promise<SettingPublicDto[]> {
    const rows = await this.load();

    return SETTING_KEYS.flatMap((key) => {
      const row = rows.get(key);
      if (!row?.isPublic) return [];

      const parsed = SETTING_DEFINITIONS[key].schema.safeParse(row.value);
      return parsed.success ? [{ key, value: parsed.data }] : [];
    });
  }

  /** Admin ro'yxati — barcha TANILGAN kalitlar, bazada yo'qlari ham. */
  async findAdmin(): Promise<SettingAdminDto[]> {
    const rows = await this.load();

    return SETTING_KEYS.map((key) => this.toAdminDto(key, rows.get(key)));
  }

  async update(key: SettingKey, value: unknown): Promise<SettingAdminDto> {
    const definition = SETTING_DEFINITIONS[key];
    const parsed = definition.schema.safeParse(value);

    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) =>
          issue.path.length
            ? `${issue.path.join('.')}: ${issue.message}`
            : issue.message,
        )
        .join('; ');
      throw new BadRequestException(`"${key}" qiymati noto‘g‘ri — ${details}`);
    }

    const json =
      parsed.data === null
        ? Prisma.JsonNull
        : (parsed.data as Prisma.InputJsonValue);

    await this.prisma.setting.upsert({
      where: { key },
      create: {
        key,
        value: json,
        description: definition.description,
        isPublic: definition.isPublicByDefault,
      },
      update: { value: json },
    });

    this.invalidate();
    const rows = await this.load();
    return this.toAdminDto(key, rows.get(key));
  }

  invalidate(): void {
    this.generation += 1;
    this.cache = null;
    this.loading = null;
  }

  private toAdminDto(key: SettingKey, row: Row | undefined): SettingAdminDto {
    const definition = SETTING_DEFINITIONS[key];
    return {
      key,
      value: this.valueOf(key, row),
      description: row?.description ?? definition.description,
      isPublic: row?.isPublic ?? definition.isPublicByDefault,
      isDefault: !row,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  private valueOf<K extends SettingKey>(
    key: K,
    row: Row | undefined,
  ): SettingValue<K> {
    const definition = SETTING_DEFINITIONS[key];
    if (!row) return definition.fallback as SettingValue<K>;

    const parsed = definition.schema.safeParse(row.value);
    if (parsed.success) return parsed.data as SettingValue<K>;

    this.logger.warn(
      `Sozlama "${key}" bazada noto‘g‘ri — standart qiymat ishlatildi`,
    );
    return definition.fallback as SettingValue<K>;
  }

  private async load(): Promise<Map<string, Row>> {
    if (
      this.cache &&
      Date.now() - this.cache.loadedAt < SETTINGS_CACHE_TTL_MS
    ) {
      return this.cache.rows;
    }
    if (this.loading) return this.loading;

    const generation = this.generation;
    const loading = this.prisma.setting
      .findMany({
        select: {
          key: true,
          value: true,
          description: true,
          isPublic: true,
          updatedAt: true,
        },
      })
      .then((list) => {
        const rows = new Map(list.map((row) => [row.key, row]));
        if (generation === this.generation) {
          this.cache = { rows, loadedAt: Date.now() };
        }
        return rows;
      })
      .finally(() => {
        if (this.loading === loading) this.loading = null;
      });

    this.loading = loading;
    return loading;
  }
}
