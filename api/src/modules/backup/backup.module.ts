import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { AppConfigService } from '../../config';
import { BackupAdminController } from './backup.admin.controller';
import { BackupService } from './backup.service';
import {
  BACKUP_MIRROR,
  FileBackupMirror,
  GoogleServiceAccount,
  GoogleSheetsMirror,
  type BackupMirror,
} from './mirrors';

/**
 * Bazaning zaxira nusxasi (T-018). Provayder tanlovi FAQAT shu yerda
 * (`BACKUP_PROVIDER`); `off` da `null` — servis jadvalni ishga tushirmaydi.
 */
@Module({
  imports: [AuthModule],
  controllers: [BackupAdminController],
  providers: [
    {
      provide: BACKUP_MIRROR,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): BackupMirror | null => {
        const { provider, fileDir, google } = config.backup;
        switch (provider) {
          case 'off':
            return null;
          case 'file':
            return new FileBackupMirror(fileDir);
          case 'google':
            return new GoogleSheetsMirror(
              google.spreadsheetId,
              new GoogleServiceAccount(google.clientEmail, google.privateKey),
            );
        }
      },
    },
    BackupService,
  ],
})
export class BackupModule {}
