import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ApiErrorDto } from '../common/dto/api-error.dto';
import { BEARER_AUTH, SWAGGER_TAG_DESCRIPTIONS, SwaggerTag } from './tags';

export const SWAGGER_PATH = 'api/docs';

const DESCRIPTION = `
Vodiy Kafel savdo platformasining backend API'si.

### Javob formati
Barcha muvaffaqiyatli javoblar \`{ "data": ... }\` ichida keladi.
Sahifalangan ro'yxatlarda qo'shimcha \`meta\` bo'ladi.

Barcha xatolar bir xil formatda — \`ApiErrorDto\` modeliga qarang.

### Autentifikatsiya
Token \`Authorization: Bearer <token>\` sarlavhasida yuboriladi.
Yuqoridagi **Authorize** tugmasi orqali kiritishingiz mumkin.

### Muhim qoidalar
- Mahsulot javoblarida ombordagi **aniq son yo'q** — faqat \`stockStatus\`.
- Buyurtma summasini backend o'zi hisoblaydi; frontend yuborgan narx e'tiborga olinmaydi.
`.trim();

/** Swagger hujjat obyektini quradi (serverni ishga tushirmasdan ham ishlaydi). */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const builder = new DocumentBuilder()
    .setTitle('Vodiy Kafel API')
    .setDescription(DESCRIPTION)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token',
      },
      BEARER_AUTH,
    );

  for (const tag of Object.values(SwaggerTag)) {
    builder.addTag(tag, SWAGGER_TAG_DESCRIPTIONS[tag]);
  }

  return SwaggerModule.createDocument(app, builder.build(), {
    extraModels: [ApiErrorDto],
  });
}

/** Swagger UI'ni /api/docs manzilida ochadi. */
export function setupSwagger(app: INestApplication): void {
  const document = buildOpenApiDocument(app);

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: `${SWAGGER_PATH}/json`,
    swaggerOptions: {
      persistAuthorization: true, // sahifa yangilanganda token yo'qolmasin
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
    },
    customSiteTitle: 'Vodiy Kafel API',
  });

  new Logger('Swagger').log(`Hujjatlar: /${SWAGGER_PATH}`);
}
