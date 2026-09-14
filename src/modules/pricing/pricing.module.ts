import { Module } from '@nestjs/common';
import { PricingResolverService } from './pricing-resolver.service';
import { PricingRulesService } from './pricing-rules.service';

/**
 * Individual narx qoidalari: narx zanjiri (B-054) va qoidalarni yuklash.
 * Qoidalar CRUD — B-055.
 */
@Module({
  providers: [PricingResolverService, PricingRulesService],
  exports: [PricingResolverService, PricingRulesService],
})
export class PricingModule {}
