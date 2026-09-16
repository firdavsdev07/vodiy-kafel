import { Injectable, Logger } from '@nestjs/common';
import type {
  CompanyData,
  CompanyLookupProvider,
} from './company-lookup.interface';

/**
 * 🧪 Soxta kompaniya ma'lumoti (B-045) — Didox.uz o'rniga.
 *
 * Haqiqiy tashqi so'rov yo'q; INN'dan DETERMINISTIK (bir xil INN — bir xil
 * natija) soxta ma'lumot yasaydi, shunda testlar barqaror bo'ladi.
 *
 * Haqiqiy Didox.uz ulanganda (spike B-044 dan keyin) — faqat shu klass
 * o'rniga `api-partners.didox.uz` bilan gaplashuvchi yangi klass yoziladi;
 * `ContractsService` va undan yuqorisi o'zgarmaydi.
 */
@Injectable()
export class MockCompanyLookupProvider implements CompanyLookupProvider {
  private readonly logger = new Logger('CompanyLookup(mock, Didox.uz o‘rniga)');

  lookup(inn: string): Promise<CompanyData> {
    this.logger.warn(
      `🧪 Didox.uz haqiqiy so'rov EMAS — INN ${inn} uchun soxta ma'lumot qaytarilmoqda (B-044 spike kutilmoqda)`,
    );

    return Promise.resolve({
      companyName: `INN ${inn} — Test MChJ`,
      director: 'Test Directorov',
      address: "Farg'ona viloyati (mock manzil)",
      registeredAt: '2020-01-01',
    });
  }
}
