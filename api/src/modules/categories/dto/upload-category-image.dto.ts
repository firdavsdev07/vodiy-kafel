import { ApiProperty } from '@nestjs/swagger';

/** Swagger uchun — multipart formadagi `file` maydonini ko'rsatadi. */
export class UploadCategoryImageBodyDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Muqova surati: JPG/PNG/WEBP, 10 MB gacha',
  })
  file!: unknown;
}
