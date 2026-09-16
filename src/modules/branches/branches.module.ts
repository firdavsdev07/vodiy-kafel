import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { BranchesAdminController } from './branches.admin.controller';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

/** Filiallar (B-041). Bino surati — global `StorageModule`. */
@Module({
  imports: [AuthModule],
  controllers: [BranchesController, BranchesAdminController],
  providers: [BranchesService],
})
export class BranchesModule {}
