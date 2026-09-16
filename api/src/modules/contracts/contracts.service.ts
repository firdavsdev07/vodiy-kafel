import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuoteService } from '../calculator/quote.service';
import { ContractStatus } from '../../common/enums';
import {
  paginate,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { Prisma, PrismaService } from '../../prisma';
import { STORAGE_SERVICE, type StorageService } from '../../storage';
import type { Actor } from '../../common/types/actor';
import { AppEvent, type ContractReadyEvent } from '../notifications/events';
import { ContractGeneratorService } from './contract-generator.service';
import { ContractQueryDto, ContractResponseDto } from './dto';
import {
  COMPANY_LOOKUP_PROVIDER,
  CONTRACT_DELIVERY_CHANNEL,
  type CompanyLookupProvider,
  type ContractDeliveryChannel,
} from './providers';

const CONTRACT_SELECT = {
  id: true,
  inn: true,
  status: true,
  pdfUrl: true,
  customerId: true,
  createdAt: true,
  order: { select: { orderNumber: true } },
} as const;

type ContractRow = Prisma.ContractGetPayload<{
  select: typeof CONTRACT_SELECT;
}>;

/**
 * Shartnoma moduli — mock (B-045, TZ 3.10).
 *
 * ⚠ Bu klass spike (B-044) natijasidan qat'i nazar ishlaydi: faqat
 *   `CompanyLookupProvider` haqiqiy Didox.uz bilan almashadi (interfeys
 *   ortida, CLAUDE.md qoida 3) — bu servis o'zgarmaydi.
 */
@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: QuoteService,
    private readonly generator: ContractGeneratorService,
    private readonly events: EventEmitter2,
    @Inject(COMPANY_LOOKUP_PROVIDER)
    private readonly companyLookup: CompanyLookupProvider,
    @Inject(CONTRACT_DELIVERY_CHANNEL)
    private readonly delivery: ContractDeliveryChannel,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async create(
    actor: Actor | undefined,
    dto: { inn: string; orderId?: string },
  ): Promise<ContractResponseDto> {
    const { customerId } = await this.quotes.requireCustomer(actor);

    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { companyName: true, contactName: true, phone: true },
    });

    let orderNumber: string | null = null;
    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: { id: dto.orderId, customerId },
        select: { orderNumber: true },
      });
      // 🔒 IDOR: begona buyurtma — 404 (CLAUDE.md qoida 6).
      if (!order) throw new NotFoundException('Buyurtma topilmadi');
      orderNumber = order.orderNumber;
    }

    const company = await this.companyLookup.lookup(dto.inn);

    // Ikki bosqich: avval yozuv (id olish uchun), keyin PDF/holat — cuid
    // qo'lda takrorlanmaydi, Prisma o'zi generatsiya qiladi.
    const draft = await this.prisma.contract.create({
      data: {
        customerId,
        orderId: dto.orderId ?? null,
        inn: dto.inn,
        companyDataJson: company as unknown as Prisma.InputJsonValue,
        pdfUrl: '',
        status: ContractStatus.DRAFT,
      },
      select: CONTRACT_SELECT,
    });

    const pdf = await this.generator.generate({
      contractId: draft.id,
      inn: dto.inn,
      company,
      customer,
      orderNumber: orderNumber ?? undefined,
    });
    const { url } = await this.storage.save({
      buffer: pdf,
      folder: 'contracts',
      extension: 'pdf',
    });

    const sent = await this.prisma.contract.update({
      where: { id: draft.id },
      data: { pdfUrl: url, status: ContractStatus.SENT },
      select: CONTRACT_SELECT,
    });

    await this.delivery.send(
      { companyName: customer.companyName, phone: customer.phone },
      {
        contractId: sent.id,
        downloadPath: `/wholesale/contracts/${sent.id}/download`,
      },
    );
    this.events.emit(AppEvent.ContractReady, {
      contractId: sent.id,
    } satisfies ContractReadyEvent);

    return this.toDto(sent);
  }

  async findMine(
    actor: Actor | undefined,
    query: ContractQueryDto,
  ): Promise<PaginatedResult<ContractResponseDto>> {
    const { customerId } = await this.quotes.requireCustomer(actor);
    const where: Prisma.ContractWhereInput = { customerId };

    const [total, rows] = await Promise.all([
      this.prisma.contract.count({ where }),
      this.prisma.contract.findMany({
        where,
        select: CONTRACT_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.take,
      }),
    ]);

    return paginate(
      rows.map((row) => this.toDto(row)),
      total,
      query,
    );
  }

  /** @internal — download uchun `pdfUrl` bilan birga. IDOR: begonasi 404. */
  private async findMineRow(
    actor: Actor | undefined,
    id: string,
  ): Promise<ContractRow> {
    const { customerId } = await this.quotes.requireCustomer(actor);
    const contract = await this.prisma.contract.findFirst({
      where: { id, customerId },
      select: CONTRACT_SELECT,
    });
    if (!contract) throw new NotFoundException('Shartnoma topilmadi');
    return contract;
  }

  async findMineOne(
    actor: Actor | undefined,
    id: string,
  ): Promise<ContractResponseDto> {
    return this.toDto(await this.findMineRow(actor, id));
  }

  async download(
    actor: Actor | undefined,
    id: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const contract = await this.findMineRow(actor, id);
    const buffer = await this.storage.read(contract.pdfUrl);
    return { buffer, filename: `shartnoma-${contract.id}.pdf` };
  }

  private toDto(row: ContractRow): ContractResponseDto {
    return {
      id: row.id,
      inn: row.inn,
      status: row.status,
      orderNumber: row.order?.orderNumber ?? null,
      createdAt: row.createdAt,
    };
  }
}
