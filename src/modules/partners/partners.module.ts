import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PartnersAdminController } from './partners.admin.controller';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

/** Hamkorlar (B-042). Logotip — global `StorageModule`. */
@Module({
  imports: [AuthModule],
  controllers: [PartnersController, PartnersAdminController],
  providers: [PartnersService],
})
export class PartnersModule {}
