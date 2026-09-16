import { Injectable } from '@nestjs/common';
import { PricingDomain } from '../../common/enums';
import { PrismaService } from '../../prisma';
import type { PricingRuleInput } from './pricing-resolver.service';

export interface CustomerPricingRules {
  product: PricingRuleInput[];
  transport: PricingRuleInput[];
}

/**
 * Mijoz qoidalarini narx zanjiri (B-054) uchun yuklaydi — BITTA so'rovda,
 * ikkala domen ham. Zanjirning o'zi sof funksiya bo'lib qoladi.
 */
@Injectable()
export class PricingRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findForCustomer(customerId: string): Promise<CustomerPricingRules> {
    const rules = await this.prisma.pricingRule.findMany({
      where: { customerId },
      select: {
        id: true,
        domain: true,
        scope: true,
        productId: true,
        factoryId: true,
        branchRegionTariffId: true,
        type: true,
        value: true,
      },
    });

    return {
      product: rules.filter((rule) => rule.domain === PricingDomain.PRODUCT),
      transport: rules.filter(
        (rule) => rule.domain === PricingDomain.TRANSPORT,
      ),
    };
  }
}
