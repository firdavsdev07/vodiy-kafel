import { Type as NestType } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { PaginationQueryDto } from './pagination-query.dto';

/** Sahifalangan natijaning xom (Swagger'siz) shakli — servis shu tipni qaytaradi. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * `items`, `total`, `page`, `limit`, `totalPages` — sahifalangan har bir
 * javob shu shaklda (B-005). Generic bo'lgani uchun Swagger uchun klass
 * factory sifatida ishlatiladi:
 *
 *   @ApiDataResponse(PaginatedResponseDto(ProductDto))
 *   class ... { }
 */
export function PaginatedResponseDto<T>(
  itemType: NestType<T>,
): NestType<PaginatedResult<T>> {
  abstract class PaginatedResponseClass implements PaginatedResult<T> {
    @ApiProperty({ type: [itemType] })
    items!: T[];

    @ApiProperty({ example: 128, description: 'Jami elementlar soni' })
    total!: number;

    @ApiProperty({ example: 1 })
    page!: number;

    @ApiProperty({ example: 20 })
    limit!: number;

    @ApiProperty({ example: 7, description: 'Jami sahifalar soni' })
    totalPages!: number;
  }

  Object.defineProperty(PaginatedResponseClass, 'name', {
    value: `Paginated${itemType.name}Dto`,
  });

  return PaginatedResponseClass as NestType<PaginatedResult<T>>;
}

/** `items` + `total` + so'rovdan → tayyor `PaginatedResult`. */
export function paginate<T>(
  items: T[],
  total: number,
  query: Pick<PaginationQueryDto, 'page' | 'limit'>,
): PaginatedResult<T> {
  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}
