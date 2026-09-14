import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Response } from 'express';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { AppConfigService } from './config';
import { VALIDATION_PIPE_OPTIONS } from './common/validation';
import {
  API_PREFIX,
  AllExceptionsFilter,
  LoggingInterceptor,
  RequestIdMiddleware,
  ResponseInterceptor,
} from './common';
import { UPLOADS_URL_PREFIX } from './storage';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  // Request ID — global prefiksdan TASHQARIDAGI so'rovlarga ham qo'llanadi,
  // shunda har bir javobda kuzatuv ID'si bo'ladi.
  const requestId = new RequestIdMiddleware();
  app.use(requestId.use.bind(requestId));

  // Yuklangan fayllar (B-022). Global prefiksga kirmaydi: /uploads/...
  // 🔒 nosniff + sandbox CSP — fayl tekshiruvidan biror narsa o'tib ketsa
  //    ham, brauzer uni sayt domenida sahifa sifatida ishga tushirmaydi.
  app.useStaticAssets(resolve(config.uploadDir), {
    prefix: UPLOADS_URL_PREFIX,
    index: false,
    dotfiles: 'deny',
    setHeaders: (res: Response) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    },
  });

  // Barcha endpointlar /api/v1 ostida (G4 qoidasi)
  app.setGlobalPrefix(API_PREFIX);

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  });

  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  if (config.swaggerEnabled) {
    setupSwagger(app);
  }

  app.enableShutdownHooks();

  await app.listen(config.port);

  logger.log(`Muhit  : ${config.nodeEnv}`);
  logger.log(`Manzil : ${config.appUrl}/${API_PREFIX}`);
  logger.log(`Port   : ${config.port}`);
  if (config.swaggerEnabled) {
    logger.log(`Hujjat : ${config.appUrl}/api/docs`);
  }
}

void bootstrap();
