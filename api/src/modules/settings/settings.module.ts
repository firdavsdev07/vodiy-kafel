import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { SettingsAdminController } from './settings.admin.controller';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

/**
 * Sozlamalar (B-025). Global — zaxira holati, kalkulyator, narx
 * qoidalari (B-055) bitta keshlangan manbadan o'qiydi.
 */
@Global()
@Module({
  imports: [AuthModule],
  controllers: [SettingsController, SettingsAdminController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
