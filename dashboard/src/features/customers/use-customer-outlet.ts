import { useOutletContext } from 'react-router';
import type { CustomerDetail } from './customer-profile';

/** Mijoz kartasi tab'lari uchun — joriy mijoz (CustomerLayout beradi). */
export function useCustomerOutlet(): CustomerDetail {
  return useOutletContext<CustomerDetail>();
}
