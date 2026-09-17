import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../auth/auth.service';
import { BranchScopeService } from '../../auth/branch-scope.service';
import type { Actor } from '../../common/types/actor';
import { PrismaService } from '../../prisma';
import { CustomersService } from './customers.service';
import { generateTemporaryPassword } from './temp-password';

/**
 * B-017 · parol tiklash. Diqqat markazida — FILIAL IZOLYATSIYASI
 * (CLAUDE.md qoida 5) va vaqtinchalik parolning sifati.
 */
describe('CustomersService (B-017)', () => {
  let service: CustomersService;
  let findUnique: jest.Mock;
  let update: jest.Mock;

  const customerInBranch1 = {
    id: 'customer-1',
    login: 'fargona-optom',
    branchId: 'branch-1',
  };

  const actor = (over: Partial<Actor> = {}): Actor => ({
    id: 'user-1',
    type: 'USER',
    role: 'BRANCH_ADMIN',
    branchId: 'branch-1',
    ...over,
  });

  beforeEach(async () => {
    findUnique = jest.fn();
    update = jest.fn().mockResolvedValue({});

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: { customer: { findUnique, update } },
        },
        {
          provide: AuthService,
          useValue: { hashPassword: (p: string) => `hash(${p})` },
        },
        // Haqiqiy BranchScopeService — mock emas: bu testlarning asosiy
        // maqsadi aynan izolyatsiya qoidasini tekshirish.
        BranchScopeService,
      ],
    }).compile();

    service = moduleRef.get(CustomersService);
  });

  it('o‘z filiali mijoziga vaqtinchalik parol beradi', async () => {
    findUnique.mockResolvedValue(customerInBranch1);

    const result = await service.resetPassword(actor(), 'customer-1');

    expect(result.login).toBe('fargona-optom');
    expect(result.temporaryPassword).toHaveLength(12);
    expect(result.mustChangePassword).toBe(true);

    const data = (
      update.mock.calls as [
        { data: { passwordHash: string; mustChangePassword: boolean } },
      ][]
    )[0][0].data;
    expect(data.mustChangePassword).toBe(true);
    // Bazaga hash yoziladi, ochiq parol emas.
    expect(data.passwordHash).toBe(`hash(${result.temporaryPassword})`);
  });

  it('🔒 BEGONA filial mijozi → 404 va parol O‘ZGARMAYDI', async () => {
    findUnique.mockResolvedValue({
      ...customerInBranch1,
      branchId: 'branch-2',
    });

    await expect(
      service.resetPassword(actor({ branchId: 'branch-1' }), 'customer-1'),
    ).rejects.toThrow(NotFoundException);

    expect(update).not.toHaveBeenCalled();
  });

  it('🔒 mavjud bo‘lmagan va begona mijoz — BIR XIL javob (404)', async () => {
    // 403 bo'lsa "bunday id bor, lekin sizniki emas" degan ma'lumot
    // sizib chiqardi va mijozlar ro'yxatini sanab chiqish mumkin bo'lardi.
    findUnique.mockResolvedValue(null);
    const notFound = await service
      .resetPassword(actor(), 'yo-q')
      .catch((e: Error) => e);

    findUnique.mockResolvedValue({
      ...customerInBranch1,
      branchId: 'branch-2',
    });
    const foreign = await service
      .resetPassword(actor(), 'customer-1')
      .catch((e: Error) => e);

    expect(notFound).toBeInstanceOf(NotFoundException);
    expect(foreign).toBeInstanceOf(NotFoundException);
    expect(foreign.message).toBe(notFound.message);
  });

  it('SUPER_ADMIN har qanday filial mijoziga parol bera oladi', async () => {
    findUnique.mockResolvedValue({
      ...customerInBranch1,
      branchId: 'branch-9',
    });

    await expect(
      service.resetPassword(
        actor({ role: 'SUPER_ADMIN', branchId: null }),
        'customer-1',
      ),
    ).resolves.toMatchObject({ mustChangePassword: true });
  });

  it('🔒 filialsiz (lekin SUPER_ADMIN ham emas) token → 404', async () => {
    // Bunday holat bazada qulflangan (users_branch_scope_check), lekin
    // token eski bo'lishi mumkin — "branchId yo'q" hech qachon
    // "hammasi ko'rinadi" degani emas.
    findUnique.mockResolvedValue(customerInBranch1);

    await expect(
      service.resetPassword(
        actor({ role: 'MANAGER', branchId: null }),
        'customer-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('generateTemporaryPassword (B-017)', () => {
  it('12 belgi va har safar boshqacha', () => {
    const generated = new Set(
      Array.from({ length: 200 }, generateTemporaryPassword),
    );
    expect(generated.size).toBe(200);
    generated.forEach((p) => expect(p).toHaveLength(12));
  });

  it('chalkashadigan belgilar ishlatilmaydi (parol og‘zaki aytiladi)', () => {
    const joined = Array.from({ length: 200 }, generateTemporaryPassword).join(
      '',
    );
    expect(joined).not.toMatch(/[0O1lI]/);
  });
});

/**
 * B-065 · mijozning o'z profili. Diqqat markazida — mijoz ID si TOKENDAN
 * olinishi (so'rovdan emas) va faol bo'lmagan hisobning to'silishi.
 */
describe('CustomersService.getMyProfile (B-065)', () => {
  let service: CustomersService;
  let findUnique: jest.Mock;

  const row = (over: Record<string, unknown> = {}) => ({
    id: 'customer-1',
    login: 'fargona-optom',
    companyName: "Farg'ona Qurilish MChJ",
    contactName: 'Alisher Karimov',
    phone: '+998901234567',
    inn: '123456789',
    mustChangePassword: false,
    isActive: true,
    branch: {
      id: 'branch-1',
      name: "Vodiy Kafel — Farg'ona",
      city: "Farg'ona",
    },
    ...over,
  });

  const customerActor: Actor = {
    id: 'customer-1',
    type: 'CUSTOMER',
    branchId: 'branch-1',
  };

  beforeEach(async () => {
    findUnique = jest.fn();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: { customer: { findUnique } } },
        { provide: AuthService, useValue: { hashPassword: jest.fn() } },
        {
          provide: BranchScopeService,
          useValue: { assertWithinScope: jest.fn() },
        },
      ],
    }).compile();
    service = moduleRef.get(CustomersService);
  });

  it("mijoz ID si TOKENDAN olinadi — so'rovdan emas", async () => {
    findUnique.mockResolvedValue(row());
    await service.getMyProfile(customerActor);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'customer-1' } }),
    );
  });

  it("filial qaytariladi — mijoz qaysi narxni ko'rayotganini bilishi kerak", async () => {
    findUnique.mockResolvedValue(row());
    const profile = await service.getMyProfile(customerActor);
    expect(profile.branch).toEqual({
      id: 'branch-1',
      name: "Vodiy Kafel — Farg'ona",
      city: "Farg'ona",
    });
  });

  it('🔒 `isActive` javobga CHIQMAYDI — u ichki maydon', async () => {
    findUnique.mockResolvedValue(row());
    const profile = await service.getMyProfile(customerActor);
    expect(profile).not.toHaveProperty('isActive');
  });

  it("🔒 parol hashi so'ralmaydi ham, qaytarilmaydi ham", async () => {
    findUnique.mockResolvedValue(row());
    const profile = await service.getMyProfile(customerActor);
    const [args] = findUnique.mock.calls[0] as [
      { select: Record<string, unknown> },
    ];
    expect(args.select.passwordHash).toBeUndefined();
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('`mustChangePassword` qaytariladi (sahifa yangilangandan keyin ham kerak)', async () => {
    findUnique.mockResolvedValue(row({ mustChangePassword: true }));
    await expect(service.getMyProfile(customerActor)).resolves.toMatchObject({
      mustChangePassword: true,
    });
  });

  it("INN yo'q bo'lsa `null`", async () => {
    findUnique.mockResolvedValue(row({ inn: null }));
    await expect(service.getMyProfile(customerActor)).resolves.toMatchObject({
      inn: null,
    });
  });

  it('bloklangan hisob — 401', async () => {
    findUnique.mockResolvedValue(row({ isActive: false }));
    await expect(service.getMyProfile(customerActor)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("mijoz o'chirilgan — 401 (404 emas: token bor, hisob yo'q)", async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.getMyProfile(customerActor)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
