import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import {
  API_PREFIX,
  AllExceptionsFilter,
  LoggingInterceptor,
  ResponseInterceptor,
} from '../../src/common';
import { VALIDATION_PIPE_OPTIONS } from '../../src/common/validation';

/**
 * `main.ts` dagi global sozlamalarni AYNAN takrorlaydi (prefiks, pipe,
 * interceptor, filter) — aks holda e2e testlar production'da yo'q
 * xatolarni yashiradi. Faylni yuklash (`useStaticAssets`) va `listen`
 * bu yerda kerak emas — supertest HTTP serverni o'zi ko'taradi.
 */
export async function bootstrapTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}
