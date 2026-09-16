import { ContractGeneratorService } from './contract-generator.service';

describe('ContractGeneratorService (B-045)', () => {
  it('haqiqiy PDF bufer yasaydi', async () => {
    const service = new ContractGeneratorService();
    const buffer = await service.generate({
      contractId: 'ct1',
      inn: '301234567',
      company: {
        companyName: 'Test MChJ',
        director: 'Test D',
        address: 'Farg‘ona',
        registeredAt: '2020-01-01',
      },
      customer: {
        companyName: 'Mijoz MChJ',
        contactName: 'Ism Familiya',
        phone: '+998900000000',
      },
      orderNumber: 'VK-2026-000001',
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    // PDF fayllar "%PDF-" bilan boshlanadi (fayl imzosi).
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(500);
  });
});
