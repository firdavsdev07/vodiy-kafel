import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Buyurtma ko'rsatkichlari (B-063).
 *
 * ⚠ Har bir son admin ro'yxatining AYNAN o'sha filtri bilan hisoblanadi
 *   (`GET /admin/orders?status=NEW` va h.k.) — kartochkani bosgan xodim
 *   ro'yxatda boshqa sonni ko'rmasligi kerak.
 */
export class DashboardOrderStatsDto {
  @ApiProperty({ description: '`status=NEW`', example: 4 })
  newCount!: number;

  @ApiProperty({ description: '`isUrgent=true`', example: 1 })
  urgentCount!: number;

  @ApiProperty({
    description: '`paymentStatus=PENDING` — kutilayotgan to‘lovi bor',
    example: 2,
  })
  unpaidCount!: number;

  @ApiProperty({
    description: 'Bugun yaratilgan buyurtmalar (Toshkent kuni bo‘yicha)',
    example: 3,
  })
  todayCount!: number;

  @ApiProperty({
    description:
      'Bugungi buyurtmalar summasi. ⚠ SATR (CLAUDE.md qoida 7) — ' +
      '`float` ga aylantirilsa aniqlik yo‘qoladi.',
    type: String,
    example: '12450000.00',
  })
  todayTotal!: string;

  @ApiProperty({ description: 'Shu oyda yaratilgan buyurtmalar', example: 37 })
  monthCount!: number;

  @ApiProperty({ type: String, example: '184300000.00' })
  monthTotal!: string;
}

/**
 * Zaxira ko'rsatkichlari (B-063).
 *
 * 🔒 Aniq SON emas — faqat nechta mahsulot shu holatda ekani. Bu xodim
 *    uchun, mijozga hech qachon ko'rsatilmaydi.
 */
export class DashboardStockStatsDto {
  @ApiProperty({ description: 'Kam qolgan mahsulotlar soni 🟡', example: 5 })
  lowCount!: number;

  @ApiProperty({ description: 'Tugagan mahsulotlar soni 🔴', example: 2 })
  outOfStockCount!: number;

  @ApiProperty({
    description:
      'Hisobda ishlatilgan global «kam qoldi» chegarasi ' +
      '(`stock.lowThresholdPallets`). Mahsulotning o‘z chegarasi bo‘lsa, ' +
      'o‘sha ustun turadi.',
    example: 20,
  })
  globalLowThreshold!: number;
}

/** Mijoz ko'rsatkichlari (B-063). */
export class DashboardCustomerStatsDto {
  @ApiProperty({ description: '`isActive=true`', example: 12 })
  activeCount!: number;

  @ApiProperty({
    description: '`hasDebt=true` — balansi qarzda bo‘lgan mijozlar',
    example: 3,
  })
  inDebtCount!: number;
}

/**
 * Bosh sahifa statistikasi — BITTA so'rovda (B-063).
 *
 * ⚠ Bungacha dashboard har kartochka uchun `…?limit=1` yuborib faqat
 *   `total` ni olardi: 5–7 so'rov va summa umuman yo'q edi (D-041,
 *   ochiq savol ❓ 3).
 *
 * 🔒 Hamma son filialga bog'langan (`BranchScopeService`): filial
 *    xodimi faqat o'z filialining raqamlarini ko'radi. SUPER_ADMIN
 *    `branchId` bermasa — butun tizim bo'yicha.
 */
export class DashboardStatsDto {
  @ApiProperty({ type: DashboardOrderStatsDto })
  orders!: DashboardOrderStatsDto;

  @ApiProperty({ type: DashboardStockStatsDto })
  stock!: DashboardStockStatsDto;

  @ApiProperty({ type: DashboardCustomerStatsDto })
  customers!: DashboardCustomerStatsDto;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    description:
      'Raqamlar qaysi filial kesimida. `null` — butun tizim ' +
      '(faqat SUPER_ADMIN).',
  })
  branchId!: string | null;

  @ApiProperty({
    type: Date,
    description:
      'Hisob vaqti (UTC). «Bugun» va «shu oy» Toshkent vaqti bo‘yicha ' +
      'hisoblanadi — xodim ekranda ko‘rgan kun bilan bir xil bo‘lsin.',
  })
  generatedAt!: Date;
}
