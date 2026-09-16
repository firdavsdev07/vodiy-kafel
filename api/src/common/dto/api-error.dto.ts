import { ApiProperty } from '@nestjs/swagger';

/**
 * Xato javobining yagona formati. Swagger'da barcha xato holatlari
 * shu modelga ishora qiladi — frontend bitta handler yozadi.
 */
export class ApiErrorDto {
  @ApiProperty({ example: 400, description: 'HTTP status kodi' })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request', description: 'Status nomi' })
  error!: string;

  @ApiProperty({
    description:
      'Xato matni. Validatsiya xatosida — matnlar massivi, aks holda bitta matn.',
    oneOf: [
      { type: 'string', example: 'Mahsulot topilmadi' },
      {
        type: 'array',
        items: { type: 'string' },
        example: ['pallets must not be less than 1'],
      },
    ],
  })
  message!: string | string[];

  @ApiProperty({ example: '/api/v1/products', description: 'So‘rov manzili' })
  path!: string;

  @ApiProperty({ example: '2026-09-08T17:02:11.419Z', format: 'date-time' })
  timestamp!: string;

  @ApiProperty({
    example: '1339b1a6-5cf7-4d0f-9d4b-10bfbd295f49',
    description:
      'Kuzatuv ID. Xato haqida xabar berganda shu ID ni ayting — log‘dan aniq so‘rov topiladi.',
    required: false,
  })
  requestId?: string;
}
