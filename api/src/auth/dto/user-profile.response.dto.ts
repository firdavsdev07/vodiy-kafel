import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';

/**
 * GET /auth/me — joriy xodim profili.
 *
 * 🔒 `passwordHash` bu yerda YO'Q va hech qachon qo'shilmaydi.
 * Maydonlar Prisma `select` orqali aniq tanlanadi — yangi ustun qo'shilsa
 * ham o'zi javobga tushib qolmaydi.
 */
export class UserProfileResponseDto {
  @ApiProperty({ example: 'cmtyomomc0000ofm2khdxnoug' })
  id!: string;

  @ApiProperty({ example: '+998900000001' })
  phone!: string;

  @ApiPropertyOptional({
    type: String,
    example: 'admin@vodiykafel.uz',
    nullable: true,
    description: 'Ixtiyoriy — kiritilmagan bo‘lsa `null`',
  })
  email!: string | null;

  @ApiProperty({ example: 'Alisher Karimov' })
  fullName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.BRANCH_ADMIN })
  role!: UserRole;

  @ApiPropertyOptional({
    type: String,
    example: 'cmtyomomq0001ofm24t896smr',
    nullable: true,
    description:
      'Xodim filiali. `SUPER_ADMIN` da `null` — u barcha filiallarni ko‘radi.',
  })
  branchId!: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'alisher_k',
    nullable: true,
  })
  telegramUsername!: string | null;
}
