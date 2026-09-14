import { ApiProperty } from '@nestjs/swagger';
import { SizePublicResponseDto } from './size-public.response.dto';

/** O'lcham — ADMIN javobi: ochiq maydonlar + tartib va ta'sir doirasi. */
export class SizeAdminResponseDto extends SizePublicResponseDto {
  @ApiProperty({
    description: 'Filtr ro‘yxatida chiqish tartibi (kichik son — oldinroq)',
    example: 1,
  })
  sortOrder!: number;

  @ApiProperty({
    description:
      'Shu o‘lchamdagi mahsulotlar soni. 0 dan katta bo‘lsa o‘lchamni ' +
      'o‘chirib bo‘lmaydi.',
    example: 5,
  })
  productCount!: number;

  @ApiProperty({ example: '2026-09-13T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-09-13T10:00:00.000Z' })
  updatedAt!: Date;
}
