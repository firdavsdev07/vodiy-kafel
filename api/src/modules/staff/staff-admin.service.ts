import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { BranchScopeService } from '../../auth/branch-scope.service';
import { BranchType, UserRole } from '../../common/enums';
import type { Actor } from '../../common/types/actor';
import { Prisma, PrismaService } from '../../prisma';
import { generateTemporaryPassword } from '../customers/temp-password';
import type {
  CreateStaffDto,
  ResetStaffPasswordDto,
  StaffCreatedDto,
  StaffDto,
  StaffPasswordResetDto,
  StaffQueryDto,
  UpdateStaffDto,
} from './dto/staff.dto';

/**
 * Qaysi xodim turi — qaysi rol va qaysi TUR filialga biriktiriladi.
 * Menejer — do'kon (RETAIL); moderator — markaziy ombor (CENTRAL, B-057).
 */
export const STAFF_KINDS = {
  MANAGER: {
    role: UserRole.MANAGER,
    branchType: BranchType.RETAIL,
    notFound: 'Menejer topilmadi',
    wrongBranch: 'Menejer faqat do‘kon (RETAIL) filialga biriktiriladi',
  },
  MODERATOR: {
    role: UserRole.MODERATOR,
    branchType: BranchType.CENTRAL,
    notFound: 'Moderator topilmadi',
    wrongBranch:
      'Moderator faqat markaziy ombor (CENTRAL) filialga biriktiriladi',
  },
} as const;

export type StaffKind = keyof typeof STAFF_KINDS;

const STAFF_SELECT = {
  id: true,
  fullName: true,
  phone: true,
  telegramUsername: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  branch: { select: { id: true, name: true } },
} as const;

type StaffRow = Prisma.UserGetPayload<{ select: typeof STAFF_SELECT }>;

/**
 * Xodimlar — menejerlar (B-043) va moderatorlar (B-057), bitta naqsh.
 *
 * 🔒 Filial: `BranchScopeService` — filial admini faqat o'z filiali
 *    xodimlarini ko'radi va yaratadi; begonasi 404. Filial TURI ham
 *    tekshiriladi (menejer → RETAIL, moderator → CENTRAL) — bu jadvallararo
 *    qoida, baza CHECK bilan ifodalanmaydi (CLAUDE.md qoida 12).
 * 🔒 Parol javobda faqat yaratishda va tiklashda (B-066) bir marta;
 *    bazada bcrypt. Admin parolni o'zi yozishi mumkin — bo'sh qoldirsa
 *    tizim yaratadi.
 * 🔒 Javobda `passwordHash` yo'q — select darajasida.
 */
@Injectable()
export class StaffAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly branchScope: BranchScopeService,
  ) {}

  async findAll(
    actor: Actor | undefined,
    kind: StaffKind,
    query: StaffQueryDto,
  ): Promise<StaffDto[]> {
    const scope = this.branchScope.resolve(actor, query.branchId);
    const search = query.search?.trim();
    const contains = { contains: search, mode: 'insensitive' as const };
    const rows = await this.prisma.user.findMany({
      where: {
        role: STAFF_KINDS[kind].role,
        ...this.branchScope.toPrismaFilter(scope),
        ...(query.isActive !== undefined && { isActive: query.isActive }),
        ...(search && {
          OR: [
            { fullName: contains },
            { phone: contains },
            { telegramUsername: contains },
          ],
        }),
      },
      select: STAFF_SELECT,
      orderBy: [{ isActive: 'desc' }, { fullName: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toDto);
  }

  async create(
    actor: Actor | undefined,
    kind: StaffKind,
    dto: CreateStaffDto,
  ): Promise<StaffCreatedDto> {
    const branchId = this.branchScope.requireBranchId(actor, dto.branchId);
    await this.assertBranch(kind, branchId);
    // 🆕 2026-09-18: mijoz endi shu raqam bilan ham kirishi mumkin
    // (`POST /auth/login`) — ikkalasi bir xil bo'lsa, kim kirishini
    // aniqlab bo'lmay qoladi.
    await this.assertPhoneNotCustomer(dto.phone);

    // Admin o'zi yozgan parol ustun; bo'sh bo'lsa — tizim yaratadi (B-066).
    const temporaryPassword = dto.password ?? generateTemporaryPassword();
    const row = await this.unique(
      this.prisma.user.create({
        data: {
          fullName: dto.fullName.trim(),
          phone: dto.phone,
          telegramUsername: dto.telegramUsername ?? null,
          role: STAFF_KINDS[kind].role,
          branchId,
          passwordHash: await this.authService.hashPassword(temporaryPassword),
        },
        select: STAFF_SELECT,
      }),
    );
    return { staff: toDto(row), temporaryPassword };
  }

  async update(
    actor: Actor | undefined,
    kind: StaffKind,
    id: string,
    dto: UpdateStaffDto,
  ): Promise<StaffDto> {
    const current = await this.requireInScope(actor, kind, id);

    let branchId: string | undefined;
    if (dto.branchId !== undefined && dto.branchId !== current.branchId) {
      // Filial xodimi boshqa filialni bersa — 404 (resolve ichida).
      branchId = this.branchScope.requireBranchId(actor, dto.branchId);
      await this.assertBranch(kind, branchId);
    }
    if (dto.phone !== undefined && dto.phone !== current.phone) {
      await this.assertPhoneNotCustomer(dto.phone);
    }

    const row = await this.unique(
      this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName.trim() }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.telegramUsername !== undefined && {
            telegramUsername: dto.telegramUsername,
          }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(branchId && { branchId }),
        },
        select: STAFF_SELECT,
      }),
    );
    return toDto(row);
  }

  /**
   * Xodimga yangi parol beradi (B-066).
   *
   * ⚠ NEGA KERAK: xodim parolini o'zi almashtiradigan endpoint YO'Q
   *   (`/auth/wholesale/change-password` — faqat optom mijoz uchun).
   *   Parolni unutgan menejer/moderator bilan hech narsa qilib
   *   bo'lmasdi — hisobni faolsizlantirib, yangisini yaratishdan boshqa
   *   yo'l qolmasdi va u bilan birga buyurtma tarixi ham uzilardi.
   *
   * 🔒 Filial izolyatsiyasi — `requireInScope` (begona filial xodimi 404).
   *    Filial admini o'z filiali menejeriga parol bera oladi; moderatorga
   *    faqat SUPER_ADMIN (controller darajasida).
   *
   * ⚠ Eski tokenlar darhol o'chmaydi: qo'ldagi access token muddati
   *   tugaguncha (15 daqiqa) ishlaydi — mijoz parolini tiklash bilan
   *   bir xil xatti-harakat (`CustomersService.resetPassword`).
   */
  async resetPassword(
    actor: Actor | undefined,
    kind: StaffKind,
    id: string,
    dto: ResetStaffPasswordDto,
  ): Promise<StaffPasswordResetDto> {
    await this.requireInScope(actor, kind, id);
    const password = dto.password ?? generateTemporaryPassword();
    const row = await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await this.authService.hashPassword(password) },
      select: { phone: true },
    });
    return { phone: row.phone, password };
  }

  async deactivate(
    actor: Actor | undefined,
    kind: StaffKind,
    id: string,
  ): Promise<StaffDto> {
    await this.requireInScope(actor, kind, id);
    const row = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: STAFF_SELECT,
    });
    return toDto(row);
  }

  // — Ichki —

  private async requireInScope(
    actor: Actor | undefined,
    kind: StaffKind,
    id: string,
  ): Promise<{ branchId: string; phone: string }> {
    const user = await this.prisma.user.findFirst({
      where: { id, role: STAFF_KINDS[kind].role },
      select: { branchId: true, phone: true },
    });
    // Boshqa rol (masalan admin ID si) ham — "topilmadi".
    if (!user?.branchId)
      throw new NotFoundException(STAFF_KINDS[kind].notFound);
    this.branchScope.assertWithinScope(
      actor,
      user.branchId,
      STAFF_KINDS[kind].notFound,
    );
    return { branchId: user.branchId, phone: user.phone };
  }

  private async assertBranch(kind: StaffKind, branchId: string): Promise<void> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { type: true, isActive: true },
    });
    if (!branch?.isActive) {
      throw new BadRequestException('Filial topilmadi yoki yopilgan');
    }
    if (branch.type !== STAFF_KINDS[kind].branchType) {
      throw new BadRequestException(STAFF_KINDS[kind].wrongBranch);
    }
  }

  private async unique<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Bu telefon raqam bilan xodim bor');
      }
      throw error;
    }
  }

  /**
   * 🆕 2026-09-18: xodim telefoni endi optom mijoz bilan bir xil bo'lishi
   * mumkin emas — ikkalasi ham `POST /auth/login` orqali shu raqam bilan
   * kiradi (bitta umumiy login sahifasi). `customers.phone` @unique, lekin
   * bu boshqa jadval — DB bitta so'rov bilan ikkalasini birga
   * tekshirolmaydi, shuning uchun dastur darajasida.
   */
  private async assertPhoneNotCustomer(phone: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (customer) {
      throw new ConflictException('Bu telefon raqam bilan mijoz hisobi bor');
    }
  }
}

function toDto(row: StaffRow): StaffDto {
  // Menejer/moderatorda filial doim bor (baza CHECK, B-006).
  return { ...row, branch: row.branch! };
}
