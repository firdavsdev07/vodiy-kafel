import { MockCompanyLookupProvider } from './mock-company-lookup.provider';

describe('MockCompanyLookupProvider (B-045)', () => {
  it('bir xil INN uchun har doim bir xil (deterministik) natija beradi', async () => {
    const provider = new MockCompanyLookupProvider();
    const first = await provider.lookup('301234567');
    const second = await provider.lookup('301234567');
    expect(first).toEqual(second);
    expect(first.companyName).toContain('301234567');
  });

  it('turli INN — turli kompaniya nomi', async () => {
    const provider = new MockCompanyLookupProvider();
    const a = await provider.lookup('111111111');
    const b = await provider.lookup('222222222');
    expect(a.companyName).not.toBe(b.companyName);
  });
});
