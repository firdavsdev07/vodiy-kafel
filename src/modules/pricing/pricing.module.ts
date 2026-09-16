import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PricingResolverService } from './pricing-resolver.service';
import { PricingRulesAdminService } from './pricing-rules-admin.service';
import { PricingRulesAdminController } from './pricing-rules.admin.controller';
import { PricingRulesService } from './pricing-rules.service';

/**
 * Individual narx qoidalari: narx zanjiri (B-054), qoidalarni yuklash va
 * admin CRUD (B-055).
 */
@Module({
  imports: [AuthModule],
  controllers: [PricingRulesAdminController],
  providers: [
    PricingResolverService,
    PricingRulesService,
    PricingRulesAdminService,
  ],
  exports: [
    PricingResolverService,
    PricingRulesService,
    PricingRulesAdminService,
  ],
})
export class PricingModule {}
