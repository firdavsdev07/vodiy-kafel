import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { bootstrapTestApp } from './utils/bootstrap-test-app';

/**
 * B-049 — auth endpointlarida rate limiting (`ThrottlerGuard`, AuthModule).
 *
 * Alohida fayl, alohida ilova nusxasi bilan ishlaydi: `ThrottlerStorage`
 * xotirada, ilova nusxasiga xos — boshqa e2e fayldagi (`critical-flows`)
 * login chaqiruvlari bilan bitta hisoblagichni bo'lishmaydi.
 */
describe('Auth rate limiting (E2E, B-049)', () => {
  let app: INestApplication<App>;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await bootstrapTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('bitta IP dan ortiqcha urinishdan keyin 429 qaytaradi', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      const res = await http
        .post('/api/v1/auth/admin/login')
        .send({ phone: '+998900000001', password: 'notogri' });
      statuses.push(res.status);
    }

    // Dastlabki urinishlar — parol xato, 401. Chegaradan (10/60s) keyin — 429.
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(statuses.slice(10)).toEqual(Array(5).fill(429));
  });
});
