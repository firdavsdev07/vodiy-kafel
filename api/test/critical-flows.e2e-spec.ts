import type { INestApplication } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaClient } from '../generated/prisma';
import { bootstrapTestApp } from './utils/bootstrap-test-app';

/**
 * Kritik biznes oqimlari — E2E (B-047).
 *
 * Ma'lumotlar `prisma/seed.ts` orqali keladi (`test/global-setup.ts` har
 * ishga tushishda migratsiya + seed qiladi) — login/parol oldindan ma'lum,
 * lekin ID'lar (cuid) emas, shuning uchun kerakli yozuvlar Prisma orqali
 * to'g'ridan-to'g'ri o'qiladi.
 *
 * Narx FORMULALARI bu yerda qayta tekshirilmaydi (CalculatorService,
 * PricingResolverService — B-046 unit testlarida to'liq qamrab olingan).
 * Bu fayl faqat ULANISH, XAVFSIZLIK VA FILIAL IZOLYATSIYASINI tekshiradi:
 * HTTP orqali kim nimani ko'radi/qila oladi.
 */

/** `{ data: T }` ko'rinishidagi javobni (ResponseInterceptor) tipli oladi. */
function dataOf<T>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
interface WholesaleAuthResult extends TokenPair {
  mustChangePassword: boolean;
}
interface CustomerCreatedResult {
  temporaryPassword: string;
}
interface CatalogItem {
  availability: string;
  price?: unknown;
  pricePerSqm?: unknown;
  stockPallets?: unknown;
}
interface QuoteResult {
  items: { pricePerSqm: string }[];
  grandTotal: string;
}
interface OrderResult {
  id: string;
  grandTotal: string;
  branchName: string;
}
interface AccountSummary {
  totalPaid: string;
}
interface UnreadCount {
  count: number;
}
interface PaymentStart {
  paymentId: string;
  qrPayload: string | null;
}
interface SimulateResult {
  status: string;
  outcome: string;
}
interface BranchProductResult {
  pricePerSqm: string;
  branch: { id: string };
}
interface ContractResult {
  id: string;
  status: string;
  orderNumber: string | null;
}

describe('Muhim biznes oqimlari (E2E, B-047)', () => {
  const DEV_PASSWORD = 'Parol123!';
  const SUPER_ADMIN_PHONE = '+998900000001';

  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;
  let prisma: PrismaClient;

  let fargonaBranchId: string;
  let andijonBranchId: string;
  let fargonaBranchName: string;
  let productId: string;

  let superAdminToken: string;
  let fargonaAdminToken: string;
  let andijonAdminToken: string;
  let fargonaCustomerToken: string;
  let andijonCustomerToken: string;
  let fargonaCustomerId: string;
  let fargonaOrderId: string;
  let andijonOrderId: string;

  async function loginAdmin(phone: string): Promise<string> {
    const res = await http
      .post('/api/v1/auth/admin/login')
      .send({ phone, password: DEV_PASSWORD })
      .expect(200);
    return dataOf<TokenPair>(res).accessToken;
  }

  /** Vaqtinchalik parol bilan kiradi, majburiy almashtiradi, YANGI tokenni qaytaradi. */
  async function loginWholesaleAndChangePassword(
    login: string,
  ): Promise<string> {
    const loginRes = await http
      .post('/api/v1/auth/wholesale/login')
      .send({ login, password: DEV_PASSWORD })
      .expect(200);
    const loginResult = dataOf<WholesaleAuthResult>(loginRes);
    expect(loginResult.mustChangePassword).toBe(true);
    const tempToken = loginResult.accessToken;

    // Parol almashtirilmaguncha boshqa endpoint 403 (PasswordChangeRequiredGuard)
    await http
      .get('/api/v1/me/account')
      .set('Authorization', `Bearer ${tempToken}`)
      .expect(403);

    const changeRes = await http
      .post('/api/v1/auth/wholesale/change-password')
      .set('Authorization', `Bearer ${tempToken}`)
      .send({ oldPassword: DEV_PASSWORD, newPassword: `${DEV_PASSWORD}Yangi1` })
      .expect(200);
    const changeResult = dataOf<WholesaleAuthResult>(changeRes);
    expect(changeResult.mustChangePassword).toBe(false);
    return changeResult.accessToken;
  }

  beforeAll(async () => {
    app = await bootstrapTestApp();
    http = request(app.getHttpServer());
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });

    const [fargona, andijon, product] = await Promise.all([
      prisma.branch.findFirstOrThrow({
        where: { city: "Farg'ona", type: 'RETAIL' },
      }),
      prisma.branch.findFirstOrThrow({
        where: { city: 'Andijon', type: 'RETAIL' },
      }),
      // Hech qanday individual narx qoidasi (PricingRule) tegmagan mahsulot —
      // "ikki filial, ikki narx" testi faqat filial bazaviy narxini solishtirsin.
      prisma.product.findFirstOrThrow({ where: { name: 'Marmar Oq' } }),
    ]);
    fargonaBranchId = fargona.id;
    andijonBranchId = andijon.id;
    fargonaBranchName = fargona.name;
    productId = product.id;

    const [fargonaAdmin, andijonAdmin, fargonaCustomer] = await Promise.all([
      prisma.user.findFirstOrThrow({
        where: { role: 'BRANCH_ADMIN', branchId: fargona.id },
      }),
      prisma.user.findFirstOrThrow({
        where: { role: 'BRANCH_ADMIN', branchId: andijon.id },
      }),
      prisma.customer.findFirstOrThrow({ where: { login: 'fargona-optom' } }),
    ]);
    fargonaCustomerId = fargonaCustomer.id;

    superAdminToken = await loginAdmin(SUPER_ADMIN_PHONE);
    fargonaAdminToken = await loginAdmin(fargonaAdmin.phone);
    andijonAdminToken = await loginAdmin(andijonAdmin.phone);
    fargonaCustomerToken =
      await loginWholesaleAndChangePassword('fargona-optom');
    andijonCustomerToken =
      await loginWholesaleAndChangePassword('andijon-optom');
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('1. Ochiq katalog — mehmon (token siz)', () => {
    it('GET /products token talab qilmaydi va narx/aniq zaxirani qaytarmaydi', async () => {
      const res = await http.get('/api/v1/products').expect(200);
      const { items } = dataOf<{ items: CatalogItem[] }>(res);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item).not.toHaveProperty('price');
        expect(item).not.toHaveProperty('pricePerSqm');
        expect(item).not.toHaveProperty('stockPallets');
        expect(['AVAILABLE', 'UNAVAILABLE']).toContain(item.availability);
      }
    });

    it('GET /branches token talab qilmaydi', async () => {
      const res = await http.get('/api/v1/branches').expect(200);
      expect(Array.isArray(dataOf<unknown[]>(res))).toBe(true);
    });
  });

  describe('2. Optom mijoz onboarding — admin bergan parol (B-017)', () => {
    it('admin mijoz yaratadi → vaqtinchalik parol qaytadi → mijoz kiradi → majburiy almashtiradi', async () => {
      const createRes = await http
        .post('/api/v1/admin/customers')
        .set('Authorization', `Bearer ${fargonaAdminToken}`)
        .send({
          login: 'e2e-yangi-mijoz',
          companyName: 'E2E Test MChJ',
          contactName: 'Test Mijoz',
          phone: '+998901234567',
        })
        .expect(201);

      const { temporaryPassword } = dataOf<CustomerCreatedResult>(createRes);
      expect(typeof temporaryPassword).toBe('string');
      expect(temporaryPassword.length).toBeGreaterThan(0);

      const loginRes = await http
        .post('/api/v1/auth/wholesale/login')
        .send({ login: 'e2e-yangi-mijoz', password: temporaryPassword })
        .expect(200);
      expect(dataOf<WholesaleAuthResult>(loginRes).mustChangePassword).toBe(
        true,
      );

      // Eski (haqiqiy) parol bilan kirib bo'lmaydi — bu mijozga admin
      // TEMP parol berdi, DEV_PASSWORD emas.
      await http
        .post('/api/v1/auth/wholesale/login')
        .send({ login: 'e2e-yangi-mijoz', password: DEV_PASSWORD })
        .expect(401);
    });
  });

  describe('3. Filial izolyatsiyasi — bitta mahsulot, ikki filial, ikki narx', () => {
    it('bir xil mahsulot Farg‘ona va Andijon mijoziga turlicha narx beradi', async () => {
      const [fargonaQuote, andijonQuote] = await Promise.all([
        http
          .post('/api/v1/calculator/quote')
          .set('Authorization', `Bearer ${fargonaCustomerToken}`)
          .send({ items: [{ productId, pallets: 5 }] })
          .expect(200),
        http
          .post('/api/v1/calculator/quote')
          .set('Authorization', `Bearer ${andijonCustomerToken}`)
          .send({ items: [{ productId, pallets: 5 }] })
          .expect(200),
      ]);

      const fargonaPrice =
        dataOf<QuoteResult>(fargonaQuote).items[0].pricePerSqm;
      const andijonPrice =
        dataOf<QuoteResult>(andijonQuote).items[0].pricePerSqm;
      expect(fargonaPrice).not.toBe(andijonPrice);
    });
  });

  describe('4. Kalkulyator → buyurtma — soxta narx e’tiborsiz qoldiriladi', () => {
    it('POST /orders backendning o‘z hisobidan foydalanadi, "frontend" yuborgan soxta summa emas', async () => {
      const quote = await http
        .post('/api/v1/calculator/quote')
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .send({ items: [{ productId, pallets: 3 }] })
        .expect(200);
      const authoritativeTotal = dataOf<QuoteResult>(quote).grandTotal;

      const orderRes = await http
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .send({
          items: [{ productId, pallets: 3 }],
          paymentMethod: 'CASH',
          // 🔒 "Buzg'unchi frontend" — bu maydonlar DTO'da yo'q, ValidationPipe
          // (whitelist: true) ularni butunlay tashlab yuboradi.
          price: '1',
          grandTotal: '1',
          branchId: andijonBranchId,
        })
        .expect(201);

      const order = dataOf<OrderResult>(orderRes);
      expect(order.grandTotal).toBe(authoritativeTotal);
      expect(order.grandTotal).not.toBe('1');
      // branchId ham e'tiborsiz qoldirilgan — buyurtma hamon Farg'onaga tegishli.
      expect(order.branchName).toBe(fargonaBranchName);

      fargonaOrderId = order.id;
    });
  });

  describe('4a. Admin holatni o‘zgartiradi — mijoz /me/updates (polling) da ko‘radi', () => {
    it('PATCH /admin/orders/:id/status dan keyin mijoz pollingda yangi holatni ko‘radi', async () => {
      const baseline = await http
        .get('/api/v1/me/updates')
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .expect(200);
      const since = dataOf<{ serverTime: string }>(baseline).serverTime;

      // Yetkazib berishsiz (olib ketish) buyurtma: NEW → LOADING → DELIVERED.
      await http
        .patch(`/api/v1/admin/orders/${fargonaOrderId}/status`)
        .set('Authorization', `Bearer ${fargonaAdminToken}`)
        .send({ status: 'LOADING', note: 'E2E: yuklashga tayyorlanmoqda' })
        .expect(200);

      const updates = await http
        .get(`/api/v1/me/updates?since=${encodeURIComponent(since)}`)
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .expect(200);
      const { orders } = dataOf<{ orders: { id: string; status: string }[] }>(
        updates,
      );
      expect(
        orders.some((o) => o.id === fargonaOrderId && o.status === 'LOADING'),
      ).toBe(true);
    });
  });

  describe('5. Mock to‘lov → PAID → balans va bildirishnoma', () => {
    it('CARD to‘lovi PAID bo‘lgach, mijoz balansi va bildirishnomasi yangilanadi', async () => {
      const before = await http
        .get('/api/v1/me/account')
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .expect(200);
      const totalPaidBefore = Number(dataOf<AccountSummary>(before).totalPaid);

      const unreadBeforeRes = await http
        .get('/api/v1/me/notifications/unread-count')
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .expect(200);
      const unreadBefore = dataOf<UnreadCount>(unreadBeforeRes).count;

      const orderRes = await http
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .send({ items: [{ productId, pallets: 2 }], paymentMethod: 'CARD' })
        .expect(201);
      const order = dataOf<OrderResult>(orderRes);
      const grandTotal = Number(order.grandTotal);

      const paymentRes = await http
        .post(`/api/v1/orders/${order.id}/payment`)
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .send({ method: 'CARD' })
        .expect(200);
      const payment = dataOf<PaymentStart>(paymentRes);
      expect(payment.qrPayload).toBeTruthy();

      // 🧪 Provayder webhook'ini simulyatsiya qiladi — token TALAB QILINMAYDI
      // (xavfsizlik chegarasi NODE_ENV, DevPaymentsController).
      const simulateRes = await http
        .post(`/api/v1/dev/payments/${payment.paymentId}/simulate`)
        .send({ status: 'PAID' })
        .expect(200);
      const simulated = dataOf<SimulateResult>(simulateRes);
      expect(simulated.status).toBe('PAID');
      expect(simulated.outcome).toBe('APPLIED');

      const after = await http
        .get('/api/v1/me/account')
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .expect(200);
      expect(Number(dataOf<AccountSummary>(after).totalPaid)).toBeCloseTo(
        totalPaidBefore + grandTotal,
        6,
      );

      const unreadAfterRes = await http
        .get('/api/v1/me/notifications/unread-count')
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .expect(200);
      expect(dataOf<UnreadCount>(unreadAfterRes).count).toBeGreaterThan(
        unreadBefore,
      );
    });
  });

  describe('6. IDOR himoyasi — begona resurslar 404 (mavjudligi oshkor qilinmaydi)', () => {
    beforeAll(async () => {
      const res = await http
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${andijonCustomerToken}`)
        .send({ items: [{ productId, pallets: 1 }], paymentMethod: 'CASH' })
        .expect(201);
      andijonOrderId = dataOf<OrderResult>(res).id;
    });

    it('mijoz begona buyurtmani ko‘ra olmaydi', async () => {
      await http
        .get(`/api/v1/me/orders/${andijonOrderId}`)
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .expect(404);
      await http
        .get(`/api/v1/me/orders/${fargonaOrderId}`)
        .set('Authorization', `Bearer ${andijonCustomerToken}`)
        .expect(404);
    });

    it('boshqa filial admini begona mijoz/buyurtmani ko‘ra olmaydi, SUPER_ADMIN — ko‘radi', async () => {
      await http
        .get(`/api/v1/admin/customers/${fargonaCustomerId}`)
        .set('Authorization', `Bearer ${andijonAdminToken}`)
        .expect(404);
      await http
        .get(`/api/v1/admin/orders/${fargonaOrderId}`)
        .set('Authorization', `Bearer ${andijonAdminToken}`)
        .expect(404);

      await http
        .get(`/api/v1/admin/customers/${fargonaCustomerId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      await http
        .get(`/api/v1/admin/orders/${fargonaOrderId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });
  });

  describe('7. Auth guard — token yo‘q', () => {
    it('POST /orders tokensiz — 401', async () => {
      await http
        .post('/api/v1/orders')
        .send({ items: [{ productId, pallets: 1 }], paymentMethod: 'CASH' })
        .expect(401);
    });
  });

  describe('8. Filial admin faqat O‘Z filialining narxini o‘zgartira oladi', () => {
    it('boshqa filialga narx yozish — 404; o‘z filialiga — 200', async () => {
      await http
        .put('/api/v1/admin/branch-products')
        .set('Authorization', `Bearer ${andijonAdminToken}`)
        .send({
          branchId: fargonaBranchId,
          productId,
          pricePerSqm: '999999.00',
        })
        .expect(404);

      const res = await http
        .put('/api/v1/admin/branch-products')
        .set('Authorization', `Bearer ${andijonAdminToken}`)
        .send({ productId, pricePerSqm: '123456.00' })
        .expect(200);
      const branchProduct = dataOf<BranchProductResult>(res);
      expect(Number(branchProduct.pricePerSqm)).toBe(123456);
      expect(branchProduct.branch.id).toBe(andijonBranchId);
    });
  });

  describe('9. Shartnoma moduli — mock (B-045)', () => {
    it('yaratadi → ro‘yxatda ko‘rinadi → PDF yuklab olinadi', async () => {
      const createRes = await http
        .post('/api/v1/wholesale/contracts')
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .send({ inn: '301234567', orderId: fargonaOrderId })
        .expect(201);
      const contract = dataOf<ContractResult>(createRes);
      expect(contract.status).toBe('SENT');
      expect(contract.orderNumber).not.toBeNull();

      const listRes = await http
        .get('/api/v1/wholesale/contracts')
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .expect(200);
      const { items } = dataOf<{ items: ContractResult[] }>(listRes);
      expect(items.some((c) => c.id === contract.id)).toBe(true);

      const downloadRes = await http
        .get(`/api/v1/wholesale/contracts/${contract.id}/download`)
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .buffer()
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(downloadRes.headers['content-type']).toBe('application/pdf');
      expect(
        (downloadRes.body as Buffer).subarray(0, 5).toString('ascii'),
      ).toBe('%PDF-');
    });

    it('🔒 begona buyurtmaga shartnoma bog‘lanmaydi; begona shartnoma yuklab olinmaydi', async () => {
      await http
        .post('/api/v1/wholesale/contracts')
        .set('Authorization', `Bearer ${andijonCustomerToken}`)
        .send({ inn: '301234567', orderId: fargonaOrderId })
        .expect(404);

      const createRes = await http
        .post('/api/v1/wholesale/contracts')
        .set('Authorization', `Bearer ${andijonCustomerToken}`)
        .send({ inn: '301234567' })
        .expect(201);
      const andijonContract = dataOf<ContractResult>(createRes);

      await http
        .get(`/api/v1/wholesale/contracts/${andijonContract.id}/download`)
        .set('Authorization', `Bearer ${fargonaCustomerToken}`)
        .expect(404);
    });
  });
});
