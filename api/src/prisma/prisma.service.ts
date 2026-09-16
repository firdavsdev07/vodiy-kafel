import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './prisma-client';
import { AppConfigService } from '../config';

/**
 * Prisma klienti — butun ilova uchun yagona ulanish.
 *
 * Prisma 7 da ulanish manzili adapter orqali beriladi (schema.prisma da emas).
 * Manzil AppConfigService'dan olinadi — ya'ni validatsiyadan o'tgan.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: AppConfigService) {
    super({
      adapter: new PrismaPg({ connectionString: config.databaseUrl }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Ma’lumotlar bazasiga ulandi');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Ma’lumotlar bazasi ulanishi yopildi');
  }
}
