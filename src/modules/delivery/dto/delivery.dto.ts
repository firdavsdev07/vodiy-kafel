import { ApiProperty } from '@nestjs/swagger';

/** Transport turi — ochiq ro'yxat (narxsiz). */
export class TransportTypePublicDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Fura' })
  name!: string;

  @ApiProperty({
    description: 'Bitta transportga sig‘adigan paddonlar soni',
    example: 20,
  })
  capacityPallets!: number;
}

/** Viloyat — ochiq ro'yxat. */
export class RegionPublicDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Toshkent shahri' })
  name!: string;
}
