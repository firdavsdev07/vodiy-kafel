import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ManagersAdminController } from './managers.admin.controller';
import { ModeratorsAdminController } from './moderators.admin.controller';
import { StaffAdminService } from './staff-admin.service';

/** Xodimlar: menejerlar (B-043), moderatorlar (B-057). */
@Module({
  imports: [AuthModule],
  controllers: [ManagersAdminController, ModeratorsAdminController],
  providers: [StaffAdminService],
})
export class StaffModule {}
