import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigService } from './config';
import {
  API_PREFIX,
  AllExceptionsFilter,
  LoggingInterceptor,
  RequestIdMiddleware,
  ResponseInterceptor,
} from './common';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(AppConfigService);
  const logger = new Logger('Bootstrap');

  // Request ID — global prefiksdan TASHQARIDAGI so'rovlarga ham qo'llanadi,
  // shunda har bir javobda kuzatuv ID'si bo'ladi.
  const requestId = new RequestIdMiddleware();
  app.use(requestId.use.bind(requestId));

  // Barcha endpointlar /api/v1 ostida (G4 qoidasi)
  app.setGlobalPrefix(API_PREFIX);

  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  });

  // whitelist: DTO'da e'lon qilinmagan maydonlar jimgina olib tashlanadi.
  // Bu G2 qoidasining bir qismi — frontend "price" yuborsa, u yo'qoladi.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

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
