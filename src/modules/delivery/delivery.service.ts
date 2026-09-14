import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '../../prisma';
import type { RegionPublicDto, TransportTypePublicDto } from './dto';

export interface ActiveTariff {
  id: string;
  price: Prisma.Decimal;
  transportType: { id: string; name: string; capacityPallets: number };
  region: { id: string; name: string };
}

const ORDER = [{ sortOrder: 'asc' }, { name: 'asc' }] as const;

/**
 * Yetkazib berish ma'lumotnomalari va tariflar (TZ 3.13, 3.14).
 * Admin CRUD — B-056.
 */
@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  findTransportTypes(): Promise<TransportTypePublicDto[]> {
    return this.prisma.transportType.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capacityPallets: true },
      orderBy: [...ORDER],
    });
  }

  findRegions(): Promise<RegionPublicDto[]> {
    return this.prisma.region.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: [...ORDER],
    });
  }

  /**
   * Filial × viloyat × transport turi bo'yicha AMALDAGI tarif.
   *
   * Tarif, viloyat va transport turi — uchalasi ham faol bo'lishi shart:
   * o'chirilgan "Vagon" eski tarif orqali kalkulyatorda qolib ketmasin.
   *
   * 🔒 `branchId` chaqiruvchidan keladi va u tokendan olingan bo'lishi
   *    kerak (CLAUDE.md qoida 5).
   */
  async requireActiveTariff(
    branchId: string,
    regionId: string,
    transportTypeId: string,
  ): Promise<ActiveTariff> {
    const tariff = await this.prisma.branchRegionTariff.findFirst({
      where: {
        branchId,
        regionId,
        transportTypeId,
        isActive: true,
        region: { isActive: true },
        transportType: { isActive: true },
      },
      select: {
        id: true,
        price: true,
        transportType: {
          select: { id: true, name: true, capacityPallets: true },
        },
        region: { select: { id: true, name: true } },
      },
    });

    if (!tariff) {
      throw new NotFoundException(
        'Bu viloyatga shu transport turi bilan yetkazib berish tarifi yo‘q',
      );
    }
    return tariff;
  }
}
