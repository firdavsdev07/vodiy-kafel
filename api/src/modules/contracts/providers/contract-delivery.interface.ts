/**
 * Tayyor shartnoma PDF'ini mijozga yetkazuvchi kanal (TZ 3.10 — "Shartnoma
 * Telegram orqali yuboriladi").
 *
 * ⚠ `NotificationChannel` (B-037) dan ATAYLAB alohida: u qisqa matnli
 *   bildirishnomalar uchun (sarlavha + matn), bu esa HUJJAT yetkazish —
 *   boshqacha ma'lumot shakli. Ikkalasi ham ishlaydi: `NotificationService`
 *   kabinetga "Shartnomangiz tayyor" deb yozadi (B-045: `CONTRACT_READY`),
 *   bu interfeys esa aynan PDF havolasini Telegram orqali yuboradi.
 *
 * ❓ TZ 7-bo'lim ochiq savoli: mijoz avval botga /start bosishi shartmi —
 *   hozircha aniqlanmagan, shuning uchun mock — faqat log.
 */
export interface ContractDeliveryChannel {
  send(
    recipient: ContractRecipient,
    contract: ContractDeliveryData,
  ): Promise<void>;
}

export interface ContractRecipient {
  companyName: string;
  phone: string;
}

export interface ContractDeliveryData {
  contractId: string;
  /** Autentifikatsiya bilan yuklab olinadigan endpoint — xom fayl yo'li emas. */
  downloadPath: string;
}

/** DI tokeni — `@Inject(CONTRACT_DELIVERY_CHANNEL) delivery: ContractDeliveryChannel`. */
export const CONTRACT_DELIVERY_CHANNEL = Symbol('CONTRACT_DELIVERY_CHANNEL');
