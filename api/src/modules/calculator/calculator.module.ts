import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { PricingModule } from '../pricing/pricing.module';
import { CalculatorController } from './calculator.controller';
import { CalculatorService } from './calculator.service';
import { QuoteService } from './quote.service';

/** Kalkulyator: sof yadro (B-026) va endpointlar (B-027). */
@Module({
  imports: [AuthModule, PricingModule, DeliveryModule],
  controllers: [CalculatorController],
  providers: [CalculatorService, QuoteService],
  exports: [CalculatorService, QuoteService],
})
export class CalculatorModule {}
