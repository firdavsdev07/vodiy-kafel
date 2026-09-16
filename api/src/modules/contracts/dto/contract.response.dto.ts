import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ContractQueryDto extends PaginationQueryDto {}

export class ContractResponseDto {
  @ApiProperty({
    example: 'cmtz0a1b2c3d4e5f6g7h8i9j',
    description:
      'Shu ID bilan `GET /wholesale/contracts/:id/download` chaqiriladi — ' +
      'PDF havolasi alohida berilmaydi, faqat autentifikatsiya bilan.',
  })
  id!: string;

  @ApiProperty({ example: '301234567' })
  inn!: string;

  @ApiProperty({ enum: ContractStatus })
  status!: ContractStatus;

  @ApiPropertyOptional({ nullable: true, example: 'VK-2026-000001' })
  orderNumber!: string | null;

  @ApiProperty({ example: '2026-09-16T10:00:00.000Z' })
  createdAt!: Date;
}
