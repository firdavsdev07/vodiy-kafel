import { createHash } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { AppConfigService } from '../../config';
import { PrismaService } from '../../prisma';
import type { BackupTable } from './backup-table';
import type { BackupStatusDto } from './dto';
import { BACKUP_MIRROR, type BackupMirror } from './mirrors';
import { collectTables } from './table-snapshot';

/** Ilova ishga tushgach birinchi nusxa — startni sekinlashtirmasin. */
const FIRST_RUN_DELAY_MS = 10_000;
/** Holat varag'i — Sheets'da birinchi bo'lib ko'rinsin. */
export const STATUS_SHEET = '_holat';

/**
 * Bazaning davriy zaxira nusxasi (T-018).
 *
 * Har `BACKUP_INTERVAL_MINUTES` da barcha jadvallar o'qiladi; ma'lumot
 * oxirgi yuborilgandan o'zgarmagan bo'lsa (sha256) tashqariga hech narsa
 * ketmaydi. Xato ilovani yiqitmaydi — holatga yoziladi, keyingi urinish
 * jadval bo'yicha. Bir vaqtda faqat bitta yozish.
 *
 * ⚠ Holat xotirada: API qayta ishga tushsa birinchi nusxa baribir yuboriladi.
 */
@Injectable()
export class BackupService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(BackupService.name);
  private timers: NodeJS.Timeout[] = [];
  private current: Promise<void> | null = null;
  private lastHash: string | null = null;
  private state: Omit<
    BackupStatusDto,
    'provider' | 'enabled' | 'intervalMinutes' | 'target' | 'running'
  > = {
    lastRunAt: null,
    lastSuccessAt: null,
    lastResult: null,
    lastError: null,
    nextRunAt: null,
    tables: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Optional()
    @Inject(BACKUP_MIRROR)
    private readonly mirror: BackupMirror | null,
  ) {}

  onApplicationBootstrap(): void {
    if (!this.mirror) return;
    const everyMs = this.config.backup.intervalMinutes * 60_000;
    const first = setTimeout(() => {
      void this.run();
      const repeat = setInterval(() => void this.run(), everyMs);
      repeat.unref();
      this.timers.push(repeat);
    }, FIRST_RUN_DELAY_MS);
    first.unref();
    this.timers.push(first);
    this.state.nextRunAt = new Date(Date.now() + FIRST_RUN_DELAY_MS);
    this.logger.log(
      `Zaxira nusxa yoqilgan: ${this.config.backup.provider} → ${this.mirror.target}, har ${this.config.backup.intervalMinutes} daqiqada`,
    );
  }

  onModuleDestroy(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers = [];
  }

  /**
   * Nusxa olish. Allaqachon ketayotgan bo'lsa — o'shani kutadi (ikkinchisi
   * boshlanmaydi). `force` — ma'lumot o'zgarmagan bo'lsa ham yuboradi.
   */
  async run({ force = false } = {}): Promise<BackupStatusDto> {
    if (this.mirror) {
      this.current ??= this.execute(this.mirror, force).finally(() => {
        this.current = null;
      });
      await this.current;
    }
    return this.status();
  }

  status(): BackupStatusDto {
    const { provider, intervalMinutes } = this.config.backup;
    return {
      provider,
      enabled: this.mirror !== null,
      intervalMinutes,
      target: this.mirror?.target ?? null,
      running: this.current !== null,
      ...this.state,
    };
  }

  private async execute(mirror: BackupMirror, force: boolean): Promise<void> {
    const startedAt = new Date();
    this.state.lastRunAt = startedAt;
    try {
      const tables = await collectTables(
        this.prisma as unknown as Record<string, unknown>,
      );
      const hash = createHash('sha256')
        .update(JSON.stringify(tables))
        .digest('hex');
      this.state.tables = tables.map((t) => ({
        name: t.name,
        rows: t.rows.length,
      }));

      if (!force && hash === this.lastHash) {
        this.state.lastResult = 'UNCHANGED';
      } else {
        await mirror.write([statusTable(tables, startedAt), ...tables]);
        this.lastHash = hash;
        this.state.lastResult = 'SENT';
        const rows = tables.reduce((sum, t) => sum + t.rows.length, 0);
        this.logger.log(
          `Zaxira nusxa yuborildi: ${tables.length} jadval, ${rows} qator`,
        );
      }
      this.state.lastSuccessAt = new Date();
      this.state.lastError = null;
    } catch (error) {
      this.state.lastResult = 'FAILED';
      this.state.lastError =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Zaxira nusxa olinmadi: ${this.state.lastError}`);
    } finally {
      this.state.nextRunAt = this.mirror
        ? new Date(Date.now() + this.config.backup.intervalMinutes * 60_000)
        : null;
    }
  }
}

/** `_holat` varag'i: qaysi jadvalda nechta qator va qachon yangilangan. */
export function statusTable(tables: BackupTable[], at: Date): BackupTable {
  const when = at.toISOString();
  return {
    name: STATUS_SHEET,
    columns: ['Jadval', 'Qatorlar soni', 'Yangilangan (UTC)'],
    rows: tables.map((t) => [t.name, t.rows.length, when]),
  };
}
