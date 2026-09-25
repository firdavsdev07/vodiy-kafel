import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType, OrderStatus, UserRole } from '../../common/enums';
import { PrismaService } from '../../prisma';
import {
  isLocationCapable,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationMessage,
  type NotificationRecipient,
} from './channels/notification-channel.interface';
import {
  AppEvent,
  type ContractReadyEvent,
  type OrderCreatedEvent,
  type OrderStatusChangedEvent,
  type PaymentPaidEvent,
  type ProductActivatedEvent,
} from './events';

/** Keng tarqatishda bir martada nechta qabul qiluvchi (bazani bosmaslik). */
const BROADCAST_CHUNK = 100;

/**
 * Holat nomlari — xabar matni uchun. ❓ TZ 3.4 dagi nomlar mijoz bilan
 * tasdiqlanmagan; o'zgarsa faqat shu jadval tahrirlanadi.
 */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'Qabul qilindi',
  SEARCHING_TRANSPORT: 'Transport qidirilmoqda',
  LOADING: 'Yuklanmoqda',
  DELIVERING: 'Yo‘lda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
};

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  grandTotal: true,
  branchId: true,
  exactLat: true,
  exactLng: true,
  guestName: true,
  guestPhone: true,
  orderingBranch: { select: { id: true, name: true } },
  customer: { select: { id: true, companyName: true, managerId: true } },
  manager: {
    select: { id: true, telegramUsername: true, isActive: true },
  },
} as const;

/**
 * Hodisa → kimga → qaysi matn → BARCHA kanallar (B-037, qoida 10).
 *
 * Kim qaysi kanalni oladi — manzil orqali:
 *   • optom mijoz — faqat kabinet (in-app); SMS emas (pullik, kabinet bor);
 *   • hisobsiz xaridor — faqat SMS (kabineti yo'q);
 *   • xodim — admin panel (in-app) + Telegram (username bo'lsa).
 *
 * Xodim doirasi (T-011, 2026-09-25) — `staffOf`:
 *   SUPER_ADMIN, MODERATOR — BARCHA xodim bildirishnomalari;
 *   BRANCH_ADMIN           — o'z filiali buyurtmalari;
 *   MANAGER                — FAQAT o'ziga biriktirilgan mijoz (yoki o'ziga
 *                            biriktirilgan buyurtma) bo'yicha.
 * 🔒 Har yozuv egasiga (`userId`) bog'lanadi — boshqa menejerning
 *    bildirishnomasini ID bo'yicha so'rash ham 404 (inbox `owner` filtri).
 *
 * 🔒 Bildirishnoma hech qachon biznes amalini buzmaydi: tinglovchi asinxron,
 *    har kanal xatosi alohida ushlanib logga yoziladi. Buyurtma/to'lov
 *    allaqachon saqlangan — xabar ketmagani uchun u qaytarilmaydi.
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: NotificationChannel[],
  ) {}

  @OnEvent(AppEvent.OrderCreated, { async: true })
  async onOrderCreated({ orderId }: OrderCreatedEvent): Promise<void> {
    await this.safely(AppEvent.OrderCreated, async () => {
      const order = await this.findOrder(orderId);
      if (!order) return;
      const payload = { orderId: order.id };
      const sum = `${order.grandTotal.toString()} so‘m`;

      await this.dispatch(await this.buyerOf(order), {
        type: NotificationType.ORDER_CREATED,
        title: 'Buyurtma qabul qilindi',
        body: `${order.orderNumber} buyurtmangiz qabul qilindi. Summa: ${sum}.`,
        payload,
      });

      const buyerName = buyerLabel(order);
      const staff = await this.staffOf(order);
      await this.dispatch(staff, {
        type: NotificationType.ORDER_CREATED,
        title: 'Yangi buyurtma',
        body: `${order.orderNumber} — ${buyerName}, ${sum}.`,
        payload,
      });

      // TZ 3.13: mijoz xaritada nuqta belgilagan bo'lsa — logistika uchun
      // tegishli menejerga (yo'q bo'lsa filial rahbariyatiga) joylashuv.
      if (order.exactLat !== null && order.exactLng !== null) {
        const manager =
          order.manager?.isActive === true
            ? [
                {
                  userId: order.manager.id,
                  telegramUsername: order.manager.telegramUsername,
                },
              ]
            : staff;
        await this.dispatchLocation(manager, order.exactLat, order.exactLng);
      }
    });
  }

  @OnEvent(AppEvent.OrderStatusChanged, { async: true })
  async onOrderStatusChanged(event: OrderStatusChangedEvent): Promise<void> {
    await this.safely(AppEvent.OrderStatusChanged, async () => {
      const order = await this.findOrder(event.orderId);
      if (!order) return;

      const note = event.note ? ` Izoh: ${event.note}` : '';
      const message = {
        type: NotificationType.ORDER_STATUS_CHANGED,
        title: `Buyurtma: ${ORDER_STATUS_LABEL[event.to]}`,
        body: `${order.orderNumber} — ${ORDER_STATUS_LABEL[event.to]}.${note}`,
        payload: { orderId: order.id },
      };
      await this.dispatch(await this.buyerOf(order), message);
      // T-011: xodimlar ham ko'rsin (admin/moderator — hammasi, menejer —
      // o'z mijozi). Avval holat o'zgarishi faqat xaridorga borardi.
      await this.dispatch(await this.staffOf(order), {
        ...message,
        body: `${order.orderNumber} (${buyerLabel(order)}) — ${ORDER_STATUS_LABEL[event.to]}.${note}`,
      });
    });
  }

  @OnEvent(AppEvent.PaymentPaid, { async: true })
  async onPaymentPaid({ paymentId }: PaymentPaidEvent): Promise<void> {
    await this.safely(AppEvent.PaymentPaid, async () => {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        select: { amount: true, order: { select: ORDER_SELECT } },
      });
      if (!payment) return;
      const { order } = payment;
      const payload = { orderId: order.id, paymentId };
      const sum = `${payment.amount.toString()} so‘m`;

      await this.dispatch(await this.buyerOf(order), {
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'To‘lov qabul qilindi',
        body: `${order.orderNumber} bo‘yicha ${sum} to‘lov qabul qilindi.`,
        payload,
      });
      await this.dispatch(await this.staffOf(order), {
        type: NotificationType.PAYMENT_RECEIVED,
        title: 'To‘landi',
        body: `${order.orderNumber} — ${sum} to‘landi.`,
        payload,
      });
    });
  }

  /**
   * Shartnoma tayyor bo'ldi (B-045, TZ 3.10) — kabinetga xabar. PDF'ning
   * o'zi Telegram orqali alohida yuboriladi (`ContractDeliveryChannel`) —
   * bu shunchaki "tayyor bo'ldi" degan qisqa xabar, hujjat emas.
   */
  @OnEvent(AppEvent.ContractReady, { async: true })
  async onContractReady({ contractId }: ContractReadyEvent): Promise<void> {
    await this.safely(AppEvent.ContractReady, async () => {
      const contract = await this.prisma.contract.findUnique({
        where: { id: contractId },
        select: { customerId: true },
      });
      if (!contract) return;

      await this.dispatch([{ customerId: contract.customerId }], {
        type: NotificationType.CONTRACT_READY,
        title: 'Shartnoma tayyor',
        body: 'Shartnomangiz tayyor va Telegram orqali yuborildi.',
        payload: { contractId },
      });
    });
  }

  /**
   * Yangi mahsulot — BARCHA faol optom mijozlarga (B-040, TZ 3.6). Chakana
   * mijozda hisob yo'q — u olmaydi.
   *
   * 🔒 Bir martalik: `announcedAt` faqat bo'sh bo'lsa yoziladi (atomar). Bu
   *    tekshiruv mahsulot hali vitrinada ko'rinishini ham talab qiladi
   *    (zavodi faol) — ko'rinmaydigan mahsulot haqida xabar bermaymiz.
   */
  @OnEvent(AppEvent.ProductActivated, { async: true })
  async onProductActivated({
    productId,
  }: ProductActivatedEvent): Promise<void> {
    await this.safely(AppEvent.ProductActivated, async () => {
      const { count } = await this.prisma.product.updateMany({
        where: {
          id: productId,
          isActive: true,
          announcedAt: null,
          factory: { isActive: true },
        },
        data: { announcedAt: new Date() },
      });
      if (count === 0) return;

      const product = await this.prisma.product.findUniqueOrThrow({
        where: { id: productId },
        select: {
          id: true,
          slug: true,
          name: true,
          size: { select: { label: true } },
          factory: { select: { name: true } },
        },
      });
      const message: NotificationMessage = {
        type: NotificationType.NEW_PRODUCT,
        title: 'Yangi mahsulot',
        body: `${product.name} (${product.size.label}) — ${product.factory.name}`,
        payload: { productId: product.id, slug: product.slug },
      };

      let cursor: string | undefined;
      for (;;) {
        const customers = await this.prisma.customer.findMany({
          where: { isActive: true },
          select: { id: true },
          orderBy: { id: 'asc' },
          take: BROADCAST_CHUNK,
          ...(cursor && { skip: 1, cursor: { id: cursor } }),
        });
        if (customers.length === 0) break;
        await this.dispatch(
          customers.map((customer) => ({ customerId: customer.id })),
          message,
        );
        cursor = customers[customers.length - 1].id;
        if (customers.length < BROADCAST_CHUNK) break;
      }
    });
  }

  /** Har qabul qiluvchi × har kanal; bitta xato qolganlarini to'xtatmaydi. */
  async dispatch(
    recipients: NotificationRecipient[],
    message: NotificationMessage,
  ): Promise<void> {
    const jobs = recipients.flatMap((recipient) =>
      this.channels.map((channel) =>
        channel
          .send(recipient, message)
          .catch((error: unknown) =>
            this.logger.error(
              `${channel.name} kanali xabarni yubora olmadi (${message.type})`,
              error instanceof Error ? error.stack : String(error),
            ),
          ),
      ),
    );
    await Promise.all(jobs);
  }

  private async dispatchLocation(
    recipients: NotificationRecipient[],
    latitude: number,
    longitude: number,
  ): Promise<void> {
    const jobs = recipients.flatMap((recipient) =>
      this.channels
        .filter(isLocationCapable)
        .map((channel) =>
          channel
            .sendLocation(recipient, latitude, longitude)
            .catch((error: unknown) =>
              this.logger.error(
                `${channel.name} kanali joylashuvni yubora olmadi`,
                error instanceof Error ? error.stack : String(error),
              ),
            ),
        ),
    );
    await Promise.all(jobs);
  }

  // — Qabul qiluvchilar —

  private findOrder(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: ORDER_SELECT,
    });
  }

  /**
   * Xaridor: optom mijoz (kabinet), hisobsiz xaridor (SMS) yoki — ta'minot
   * buyurtmasida (B-058) — buyurtma bergan do'kon filialining admini.
   */
  private async buyerOf(order: {
    customer: { id: string } | null;
    guestPhone: string | null;
    orderingBranch: { id: string } | null;
  }): Promise<NotificationRecipient[]> {
    if (order.customer) return [{ customerId: order.customer.id }];
    if (order.guestPhone) return [{ phone: order.guestPhone }];
    if (order.orderingBranch) {
      const admins = await this.prisma.user.findMany({
        where: {
          branchId: order.orderingBranch.id,
          role: UserRole.BRANCH_ADMIN,
          isActive: true,
        },
        select: { id: true, telegramUsername: true },
      });
      return admins.map((user) => ({
        userId: user.id,
        telegramUsername: user.telegramUsername,
      }));
    }
    return [];
  }

  /**
   * Buyurtma haqida xabar oladigan xodimlar (T-011). Takrorsiz, faqat
   * faollar:
   *   • BARCHA SUPER_ADMIN va MODERATOR — "hammasini ko'radi";
   *   • buyurtma filialining admini (RETAIL — filial admini);
   *   • menejer — buyurtmaga YOKI mijozga biriktirilgan bo'lsa. Boshqa
   *     menejerlar olmaydi (avval ham, endi ham).
   *
   * ⚠ Avval SUPER_ADMIN umuman olmasdi ("shovqin"), MODERATOR esa faqat
   *   markaziy ombor buyurtmalarini olardi — mijoz talabi bilan o'zgardi.
   */
  private async staffOf(order: {
    branchId: string | null;
    manager: { id: string } | null;
    customer?: { managerId: string | null } | null;
  }): Promise<NotificationRecipient[]> {
    const assigned = [order.manager?.id, order.customer?.managerId].filter(
      (id): id is string => Boolean(id),
    );
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { role: { in: [UserRole.SUPER_ADMIN, UserRole.MODERATOR] } },
          ...(order.branchId
            ? [{ branchId: order.branchId, role: UserRole.BRANCH_ADMIN }]
            : []),
          ...(assigned.length > 0 ? [{ id: { in: assigned } }] : []),
        ],
      },
      select: { id: true, telegramUsername: true },
    });
    return users.map((user) => ({
      userId: user.id,
      telegramUsername: user.telegramUsername,
    }));
  }

  private async safely(
    event: string,
    handler: () => Promise<void>,
  ): Promise<void> {
    try {
      await handler();
    } catch (error) {
      this.logger.error(
        `"${event}" bildirishnomasi xatosi`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

/** Xodimga ko'rinadigan xaridor nomi. */
function buyerLabel(order: {
  customer: { companyName: string } | null;
  guestName: string | null;
  orderingBranch: { name: string } | null;
}): string {
  return (
    order.customer?.companyName ??
    order.guestName ??
    (order.orderingBranch && `Ta’minot: ${order.orderingBranch.name}`) ??
    'Xaridor'
  );
}
