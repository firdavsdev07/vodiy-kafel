import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { LeadsAdminController } from './leads.admin.controller';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

/**
 * Saytdagi aloqa formasi — murojaatlar (T-013). Rate-limit uchun
 * `ThrottlerModule` global (`AuthModule` da `forRoot`).
 */
@Module({
  imports: [AuthModule],
  controllers: [LeadsController, LeadsAdminController],
  providers: [LeadsService],
})
export class LeadsModule {}
