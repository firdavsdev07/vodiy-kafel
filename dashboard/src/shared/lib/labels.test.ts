import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  branchTypeLabel,
  contractStatusLabel,
  mediaTypeLabel,
  notificationTypeLabel,
  orderingTypeLabel,
  orderSourceLabel,
  orderStatusActionLabel,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  pricingDomainLabel,
  pricingScopeLabel,
  pricingValueTypeLabel,
  roleLabel,
  stockStatusLabel,
  surfaceLabel,
  transactionTypeLabel,
} from './labels';
import { orderStatusTone, paymentStatusTone, stockStatusTone, transactionTypeTone } from './status-tone';

type Schemas = Record<string, { properties?: Record<string, { enum?: string[] }> }>;
const openapi = JSON.parse(readFileSync(resolve(__dirname, '../../../../api/openapi.json'), 'utf8')) as {
  components: { schemas: Schemas };
};
const enumOf = (schema: string, prop: string) => [...(openapi.components.schemas[schema]?.properties?.[prop]?.enum ?? [])].sort();
const keys = (dict: object) => Object.keys(dict).sort();

describe('lug‘at (G7, D-043)', () => {
  it('har holatda ham rang, ham matn bor — kalitlar bir xil', () => {
    expect(keys(orderStatusLabel)).toEqual(keys(orderStatusTone));
    expect(keys(paymentStatusLabel)).toEqual(keys(paymentStatusTone));
    expect(keys(stockStatusLabel)).toEqual(keys(stockStatusTone));
    expect(keys(transactionTypeLabel)).toEqual(keys(transactionTypeTone));
  });

  it('🛡 lug‘at openapi.json enum’lari bilan AYNAN mos (backend yangi qiymat qo‘shsa — yiqiladi)', () => {
    const pairs: [object, string, string][] = [
      [orderStatusLabel, 'AdminOrderListItemDto', 'status'],
      [orderStatusActionLabel, 'AdminOrderListItemDto', 'status'],
      [orderSourceLabel, 'AdminOrderListItemDto', 'source'],
      [orderingTypeLabel, 'AdminOrderListItemDto', 'orderingType'],
      [paymentStatusLabel, 'OrderPaymentDto', 'status'],
      [paymentMethodLabel, 'AdminOrderPaymentDto', 'method'],
      [stockStatusLabel, 'ProductStockSummaryDto', 'stockStatus'],
      [transactionTypeLabel, 'AccountTransactionAdminDto', 'type'],
      [roleLabel, 'UserProfileResponseDto', 'role'],
      [branchTypeLabel, 'BranchAdminDto', 'type'],
      [contractStatusLabel, 'ContractResponseDto', 'status'],
      [notificationTypeLabel, 'NotificationDto', 'type'],
      [surfaceLabel, 'ProductListItemResponseDto', 'surface'],
      [mediaTypeLabel, 'ProductMediaResponseDto', 'type'],
      [pricingDomainLabel, 'CreatePricingRuleDto', 'domain'],
      [pricingScopeLabel, 'CreatePricingRuleDto', 'scope'],
      [pricingValueTypeLabel, 'CreatePricingRuleDto', 'type'],
    ];
    for (const [dict, schema, prop] of pairs) {
      const expected = enumOf(schema, prop);
      expect(expected.length, `${schema}.${prop} openapi.json da topilmadi`).toBeGreaterThan(0);
      expect(keys(dict), `${schema}.${prop}`).toEqual(expected);
      for (const text of Object.values(dict)) expect(String(text).trim()).not.toBe('');
    }
  });
});
