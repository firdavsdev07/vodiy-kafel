import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global modul — har bir modulda alohida import qilish shart emas.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
