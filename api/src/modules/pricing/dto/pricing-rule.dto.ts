import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
  PricingDomain,
  PricingScope,
  PricingValueType,
  UserRole,
} from '../../../common/enums';
import { IsNonZeroDecimalString } from '../../../common/validators/decimal-string';

export class CreatePricingRuleDto {
  @ApiProperty({
    enum: PricingDomain,
    description: 'PRODUCT — mahsulot narxi (m²); TRANSPORT — yo‘l kira',
  })
  @IsEnum(PricingDomain)
  domain!: PricingDomain;

  @ApiProperty({
    enum: PricingScope,
    description:
      'PRODUCT domeni: PRODUCT (bitta mahsulot) | FACTORY (zavod) | ALL.\n' +
      'TRANSPORT domeni: ROUTE (filial tarifi: viloyat × transport) | ALL.\n' +
      'Eng aniq qoida yutadi.',
  })
  @IsEnum(PricingScope)
  scope!: PricingScope;

  @ApiPropertyOptional({
    description:
      'scope=PRODUCT → productId; FACTORY → factoryId; ROUTE → tarif ID ' +
      '(mijoz filialiniki). scope=ALL — berilmaydi.',
  })
  @IsOptional()
  @IsString()
  scopeId?: string;

  @ApiProperty({
    enum: PricingValueType,
    description: 'FIXED — aniq narx (so‘m); PERCENT — bazaviy narxga foiz',
  })
  @IsEnum(PricingValueType)
  type!: PricingValueType;

  @ApiProperty({
    example: '-10',
    description:
      'Satr. FIXED — musbat summa (`"78000"`). PERCENT — `"-10"` (10% ' +
      'chegirma) yoki `"5"` (ustama); −100 dan katta, 0 emas.\n\n' +
      '🔒 Filial admini: faqat PERCENT, faqat chegirma va ' +
      '`pricing.branchAdminMaxDiscountPercent` chegarasigacha.',
  })
  @IsNonZeroDecimalString(12, 2)
  value!: string;
}

export class PricingRuleTargetDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({
    example: 'Lyuks Granit Bej',
    description: 'Mahsulot / zavod nomi yoki "Viloyat · Transport"',
  })
  name!: string;
}

export class PricingRuleStaffRefDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ example: 'Farg‘ona filial admini' })
  fullName!: string;
}

export class PricingRuleAdminDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  id!: string;

  @ApiProperty({ enum: PricingDomain })
  domain!: PricingDomain;

  @ApiProperty({ enum: PricingScope })
  scope!: PricingScope;

  @ApiProperty({
    type: PricingRuleTargetDto,
    nullable: true,
    description: 'scope=ALL — `null`',
  })
  target!: PricingRuleTargetDto | null;

  @ApiProperty({ enum: PricingValueType })
  type!: PricingValueType;

  @ApiProperty({ example: '-10' })
  value!: string;

  @ApiProperty({ type: PricingRuleStaffRefDto, nullable: true })
  createdBy!: PricingRuleStaffRefDto | null;

  @ApiProperty({ enum: [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN] })
  createdByRole!: UserRole;

  @ApiProperty({ type: Date })
  createdAt!: Date;
}
