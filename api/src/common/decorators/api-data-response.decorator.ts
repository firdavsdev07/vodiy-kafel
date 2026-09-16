import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

interface DataResponseOptions {
  status?: number;
  description?: string;
  isArray?: boolean;
}

/**
 * Muvaffaqiyatli javobni hujjatlaydi.
 *
 * ⚠ Nega kerak: ResponseInterceptor har bir javobni `{ data: ... }` ichiga
 * o'raydi. Oddiy `@ApiOkResponse({ type: X })` bu o'ramni ko'rsatmaydi va
 * Swagger frontendga YOLG'ON kontrakt beradi. Bu dekorator o'ramni ham
 * sxemaga qo'shadi.
 *
 * Ishlatilishi:
 *   @ApiDataResponse(ProductDto)
 *   @ApiDataResponse(ProductDto, { isArray: true })
 *   @ApiDataResponse(OrderDto, { status: 201, description: 'Buyurtma yaratildi' })
 */
export const ApiDataResponse = <TModel extends Type<unknown>>(
  model: TModel,
  options: DataResponseOptions = {},
) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiResponse({
      status: options.status ?? 200,
      description: options.description,
      schema: {
        type: 'object',
        required: ['data'],
        properties: {
          data: options.isArray
            ? { type: 'array', items: { $ref: getSchemaPath(model) } }
            : { $ref: getSchemaPath(model) },
          meta: {
            type: 'object',
            additionalProperties: true,
            description: 'Qo‘shimcha ma’lumot (masalan sahifalash)',
          },
        },
      },
    }),
  );
