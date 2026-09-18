import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../config';
import type { TokenPayload } from '../common/types/token-payload';
import { PrismaService } from '../prisma';
import { AuthService } from './auth.service';

/**
 * B-015 testlari. Diqqat markazida — XAVFSIZLIK invariantlari:
 *   • parol chindan tekshiriladi (hardcode payload emas)
 *   • uch xato holati bir xil javob beradi (foydalanuvchini aniqlab olmaslik)
 *   • access token refresh sifatida ishlamaydi
 *   • passwordHash javobga chiqmaydi
 */
describe('AuthService (B-015, B-017)', () => {
  const JWT_SECRET = 'test-access-secret-kamida-32-belgi-bolishi-kerak';
  const JWT_REFRESH_SECRET = 'test-refresh-secret-kamida-32-belgi-boladi!!';
  const PASSWORD = 'Parol123!';

  let service: AuthService;
  let jwtService: JwtService;
  let findUnique: jest.Mock;
  let customerFindUnique: jest.Mock;
  let customerUpdate: jest.Mock;
  let passwordHash: string;

  const activeUser = {
    id: 'user-1',
    passwordHash: '',
    role: 'BRANCH_ADMIN',
    branchId: 'branch-1',
    isActive: true,
  };

  beforeAll(async () => {
    // Bir marta hashlanadi — bcrypt qimmat operatsiya.
    passwordHash = await new AuthService(
      new JwtService({}),
      {} as PrismaService,
      {} as AppConfigService,
    ).hashPassword(PASSWORD);
  });

  beforeEach(async () => {
    findUnique = jest.fn();
    customerFindUnique = jest.fn();
    customerUpdate = jest.fn();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: new JwtService({}) },
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique },
            customer: {
              findUnique: customerFindUnique,
              update: customerUpdate,
            },
          },
        },
        {
          provide: AppConfigService,
          useValue: {
            jwt: {
              secret: JWT_SECRET,
              expiresIn: '15m',
              refreshSecret: JWT_REFRESH_SECRET,
              refreshExpiresIn: '30d',
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jwtService = moduleRef.get(JwtService);
  });

  const decodeAccess = (token: string): TokenPayload =>
    jwtService.verify<TokenPayload>(token, { secret: JWT_SECRET });

  describe('adminLogin', () => {
    it('to‘g‘ri parol bilan token juftligi beradi, payload bazadan olinadi', async () => {
      findUnique.mockResolvedValue({ ...activeUser, passwordHash });

      const tokens = await service.adminLogin({
        phone: '+998900000001',
        password: PASSWORD,
      });

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();

      const payload = decodeAccess(tokens.accessToken);
      expect(payload).toMatchObject({
        sub: 'user-1',
        type: 'USER',
        role: 'BRANCH_ADMIN',
        branchId: 'branch-1',
      });
    });

    it('noto‘g‘ri parol → 401', async () => {
      findUnique.mockResolvedValue({ ...activeUser, passwordHash });

      await expect(
        service.adminLogin({
          phone: '+998900000001',
          password: 'boshqa-parol',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('mavjud bo‘lmagan raqam, o‘chirilgan hisob va xato parol — BIR XIL xabar', async () => {
      const messages: string[] = [];

      const cases = [
        { user: null, password: PASSWORD }, // raqam yo'q
        {
          user: { ...activeUser, passwordHash, isActive: false },
          password: PASSWORD,
        }, // faol emas
        { user: { ...activeUser, passwordHash }, password: 'xato' }, // parol xato
      ];

      for (const c of cases) {
        findUnique.mockResolvedValue(c.user);
        try {
          await service.adminLogin({
            phone: '+998900000001',
            password: c.password,
          });
          throw new Error('401 kutilgan edi, lekin xato bo‘lmadi');
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
          messages.push((error as UnauthorizedException).message);
        }
      }

      expect(new Set(messages).size).toBe(1);
    });

    it('foydalanuvchi topilmasa ham parol solishtiriladi (javob vaqti tenglashadi)', async () => {
      findUnique.mockResolvedValue(null);
      const compare = jest.spyOn(service, 'validatePassword');

      await expect(
        service.adminLogin({ phone: '+998999999999', password: PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);

      expect(compare).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshTokens', () => {
    const validRefreshToken = (payload: Partial<TokenPayload> = {}) =>
      new JwtService({}).sign(
        {
          sub: 'user-1',
          type: 'USER',
          role: 'BRANCH_ADMIN',
          branchId: 'branch-1',
          ...payload,
        },
        { secret: JWT_REFRESH_SECRET, expiresIn: '30d' },
      );

    it('yaroqli refresh token → yangi juftlik', async () => {
      findUnique.mockResolvedValue(activeUser);

      const tokens = await service.refreshTokens({
        refreshToken: validRefreshToken(),
      });

      expect(decodeAccess(tokens.accessToken).sub).toBe('user-1');
    });

    it('rol va filial tokendan emas, bazadan qayta o‘qiladi', async () => {
      // Token eski filialni ko'rsatadi, baza esa yangisini.
      findUnique.mockResolvedValue({
        ...activeUser,
        role: 'MANAGER',
        branchId: 'branch-YANGI',
      });

      const tokens = await service.refreshTokens({
        refreshToken: validRefreshToken({
          role: 'BRANCH_ADMIN',
          branchId: 'branch-1',
        }),
      });

      expect(decodeAccess(tokens.accessToken)).toMatchObject({
        role: 'MANAGER',
        branchId: 'branch-YANGI',
      });
    });

    it('ACCESS token refresh sifatida ishlamaydi (kalitlar boshqa)', async () => {
      findUnique.mockResolvedValue({ ...activeUser, passwordHash });
      const { accessToken } = await service.adminLogin({
        phone: '+998900000001',
        password: PASSWORD,
      });

      await expect(
        service.refreshTokens({ refreshToken: accessToken }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('yasama yoki buzilgan token → 401', async () => {
      await expect(
        service.refreshTokens({ refreshToken: 'a.b.c' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('muddati tugagan token → 401', async () => {
      const expired = new JwtService({}).sign(
        { sub: 'user-1', type: 'USER', role: 'BRANCH_ADMIN' },
        { secret: JWT_REFRESH_SECRET, expiresIn: '-1s' },
      );

      await expect(
        service.refreshTokens({ refreshToken: expired }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('hisob o‘chirilgan bo‘lsa → 401', async () => {
      findUnique.mockResolvedValue({ ...activeUser, isActive: false });

      await expect(
        service.refreshTokens({ refreshToken: validRefreshToken() }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('mijoz tokeni mijoz jadvalidan o‘qiladi, users ga TEGILMAYDI', async () => {
      // B-017 gacha bu 401 edi. Endi mijoz ham refresh qiladi — lekin
      // `sub` hech qachon `users` da qidirilmasligi shart, aks holda
      // mijoz id si tasodifan xodim id siga to'g'ri kelib qolishi mumkin.
      customerFindUnique.mockResolvedValue({
        id: 'customer-1',
        branchId: 'branch-1',
        isActive: true,
        mustChangePassword: false,
      });

      const tokens = await service.refreshTokens({
        refreshToken: validRefreshToken({
          sub: 'customer-1',
          type: 'CUSTOMER',
          role: undefined,
        }),
      });

      expect(decodeAccess(tokens.accessToken)).toMatchObject({
        sub: 'customer-1',
        type: 'CUSTOMER',
      });
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('o‘chirilgan mijoz refresh qilolmaydi', async () => {
      customerFindUnique.mockResolvedValue({
        id: 'customer-1',
        branchId: 'branch-1',
        isActive: false,
        mustChangePassword: false,
      });

      await expect(
        service.refreshTokens({
          refreshToken: validRefreshToken({
            sub: 'customer-1',
            type: 'CUSTOMER',
          }),
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    /** Xodim tokeni — getProfile endi `sub` emas, butun payload oladi. */
    const staffToken = (sub: string): TokenPayload => ({
      sub,
      type: 'USER',
      role: 'BRANCH_ADMIN',
      branchId: 'branch-1',
    });

    it('profil qaytaradi, passwordHash va isActive javobda YO‘Q', async () => {
      findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+998900000001',
        email: null,
        fullName: 'Alisher Karimov',
        role: 'BRANCH_ADMIN',
        branchId: 'branch-1',
        telegramUsername: null,
        isActive: true,
      });

      const profile = await service.getProfile(staffToken('user-1'));

      expect(profile).toEqual({
        id: 'user-1',
        phone: '+998900000001',
        email: null,
        fullName: 'Alisher Karimov',
        role: 'BRANCH_ADMIN',
        branchId: 'branch-1',
        telegramUsername: null,
      });
      expect(profile).not.toHaveProperty('passwordHash');
      expect(profile).not.toHaveProperty('isActive');

      // Prisma so'rovida ham passwordHash tanlanmaydi.
      const calls = findUnique.mock.calls as [
        { select: Record<string, boolean> },
      ][];
      expect(calls[0][0].select.passwordHash).toBeUndefined();
    });

    it('faol bo‘lmagan hisob → 401', async () => {
      findUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+998900000001',
        email: null,
        fullName: 'Alisher Karimov',
        role: 'BRANCH_ADMIN',
        branchId: 'branch-1',
        telegramUsername: null,
        isActive: false,
      });

      await expect(service.getProfile(staffToken('user-1'))).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('🔒 mijoz tokeni bilan xodim profili olinmaydi', async () => {
      // Tekshiruvsiz mijoz `sub` i `users` da qidirilardi — tasodifiy
      // moslik bo'lsa begona profil ochilib ketardi.
      await expect(
        service.getProfile({
          sub: 'customer-1',
          type: 'CUSTOMER',
          branchId: 'branch-1',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(findUnique).not.toHaveBeenCalled();
    });

    it('foydalanuvchi topilmasa → 401', async () => {
      findUnique.mockResolvedValue(null);
      await expect(service.getProfile(staffToken('yo-q'))).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── B-017 · Optom mijoz kirishi ──────────────────────────────────────────
  describe('wholesaleLogin', () => {
    const activeCustomer = {
      id: 'customer-1',
      passwordHash: '',
      branchId: 'branch-1',
      isActive: true,
      mustChangePassword: false,
    };

    it('to‘g‘ri parol → token juftligi, payload bazadan', async () => {
      customerFindUnique.mockResolvedValue({ ...activeCustomer, passwordHash });

      const result = await service.wholesaleLogin({
        login: 'fargona-optom',
        password: PASSWORD,
      });

      expect(result.mustChangePassword).toBe(false);
      expect(decodeAccess(result.accessToken)).toMatchObject({
        sub: 'customer-1',
        type: 'CUSTOMER',
        branchId: 'branch-1',
      });
    });

    it('🔒 mijoz tokenida ROL YO‘Q (xodim endpointlariga o‘tolmasin)', async () => {
      customerFindUnique.mockResolvedValue({ ...activeCustomer, passwordHash });

      const { accessToken } = await service.wholesaleLogin({
        login: 'fargona-optom',
        password: PASSWORD,
      });

      expect(decodeAccess(accessToken).role).toBeUndefined();
    });

    it('login katta harf va bo‘shliq bilan kelsa ham topiladi', async () => {
      customerFindUnique.mockResolvedValue({ ...activeCustomer, passwordHash });

      await service.wholesaleLogin({
        login: '  Fargona-OPTOM  ',
        password: PASSWORD,
      });

      const calls = customerFindUnique.mock.calls as [
        { where: { login: string } },
      ][];
      expect(calls[0][0].where.login).toBe('fargona-optom');
    });

    it('vaqtinchalik parol bo‘lsa mustChangePassword tokenga ham tushadi', async () => {
      customerFindUnique.mockResolvedValue({
        ...activeCustomer,
        passwordHash,
        mustChangePassword: true,
      });

      const result = await service.wholesaleLogin({
        login: 'fargona-optom',
        password: PASSWORD,
      });

      expect(result.mustChangePassword).toBe(true);
      // Javobdagi bayroq yetmaydi — frontend uni e'tiborsiz qoldirishi mumkin.
      // Guard tokendagi qiymatga qaraydi, shuning uchun u ham to'g'ri bo'lsin.
      expect(decodeAccess(result.accessToken).mustChangePassword).toBe(true);
    });

    it('login yo‘q, hisob o‘chirilgan va parol xato — BIR XIL xabar', async () => {
      const messages: string[] = [];
      const cases = [
        { customer: null, password: PASSWORD },
        {
          customer: { ...activeCustomer, passwordHash, isActive: false },
          password: PASSWORD,
        },
        { customer: { ...activeCustomer, passwordHash }, password: 'xato' },
      ];

      for (const c of cases) {
        customerFindUnique.mockResolvedValue(c.customer);
        try {
          await service.wholesaleLogin({
            login: 'fargona-optom',
            password: c.password,
          });
          throw new Error('401 kutilgan edi');
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
          messages.push((error as UnauthorizedException).message);
        }
      }

      expect(new Set(messages).size).toBe(1);
    });

    it('login topilmasa ham parol solishtiriladi (javob vaqti tenglashadi)', async () => {
      customerFindUnique.mockResolvedValue(null);
      const compare = jest.spyOn(service, 'validatePassword');

      await expect(
        service.wholesaleLogin({ login: 'yo-q', password: PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);

      expect(compare).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * 🆕 2026-09-18 (mijoz talabi) · YAGONA login — xodim va optom mijoz
   * bitta endpointdan, telefon + parol bilan kiradi.
   */
  describe('login (yagona, 2026-09-18)', () => {
    const activeCustomer = {
      id: 'customer-1',
      passwordHash: '',
      branchId: 'branch-1',
      isActive: true,
      mustChangePassword: false,
    };

    it('xodim telefoni — `actorType: USER`, token`da rol bor', async () => {
      findUnique.mockResolvedValue({ ...activeUser, passwordHash });

      const result = await service.login({
        phone: '+998900000001',
        password: PASSWORD,
      });

      expect(result.actorType).toBe('USER');
      expect(result.mustChangePassword).toBe(false);
      expect(decodeAccess(result.accessToken)).toMatchObject({
        sub: 'user-1',
        type: 'USER',
        role: 'BRANCH_ADMIN',
        branchId: 'branch-1',
      });
    });

    it('mijoz telefoni (xodimda topilmagach) — `actorType: CUSTOMER`', async () => {
      findUnique.mockResolvedValue(null); // xodimda yo'q
      customerFindUnique.mockResolvedValue({ ...activeCustomer, passwordHash });

      const result = await service.login({
        phone: '+998933000001',
        password: PASSWORD,
      });

      expect(result.actorType).toBe('CUSTOMER');
      expect(decodeAccess(result.accessToken)).toMatchObject({
        sub: 'customer-1',
        type: 'CUSTOMER',
        branchId: 'branch-1',
      });
      // 🔒 mijoz tokenida rol yo'q — xodim endpointlariga o'tolmasin
      expect(decodeAccess(result.accessToken).role).toBeUndefined();
    });

    it('mijozning vaqtinchalik paroli — javobda ham, tokenda ham', async () => {
      findUnique.mockResolvedValue(null);
      customerFindUnique.mockResolvedValue({
        ...activeCustomer,
        passwordHash,
        mustChangePassword: true,
      });

      const result = await service.login({
        phone: '+998933000001',
        password: PASSWORD,
      });

      expect(result.mustChangePassword).toBe(true);
      expect(decodeAccess(result.accessToken).mustChangePassword).toBe(true);
    });

    it('🔒 xodim TOPILGAN, parol xato — mijoz jadvali UMUMAN so‘ralmaydi', async () => {
      findUnique.mockResolvedValue({ ...activeUser, passwordHash });

      await expect(
        service.login({ phone: '+998900000001', password: 'xato' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(customerFindUnique).not.toHaveBeenCalled();
    });

    it('🔒 hech qayerda yo‘q, xodimda o‘chirilgan, mijozda parol xato — BIR XIL xabar', async () => {
      const messages: string[] = [];
      const cases: Array<() => void> = [
        () => {
          findUnique.mockResolvedValue(null);
          customerFindUnique.mockResolvedValue(null);
        },
        () => {
          findUnique.mockResolvedValue({
            ...activeUser,
            passwordHash,
            isActive: false,
          });
        },
        () => {
          findUnique.mockResolvedValue(null);
          customerFindUnique.mockResolvedValue({
            ...activeCustomer,
            passwordHash,
          });
        },
      ];

      for (const setup of cases) {
        setup();
        try {
          await service.login({
            phone: '+998900000001',
            password: setup === cases[2] ? 'xato' : PASSWORD,
          });
          throw new Error('401 kutilgan edi');
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
          messages.push((error as UnauthorizedException).message);
        }
      }

      expect(new Set(messages).size).toBe(1);
    });
  });

  describe('changeWholesalePassword', () => {
    const customerToken: TokenPayload = {
      sub: 'customer-1',
      type: 'CUSTOMER',
      branchId: 'branch-1',
      mustChangePassword: true,
    };

    const storedCustomer = () => ({
      id: 'customer-1',
      passwordHash,
      branchId: 'branch-1',
      isActive: true,
    });

    it('parolni almashtiradi, bayroqni tushiradi va YANGI token beradi', async () => {
      customerFindUnique.mockResolvedValue(storedCustomer());
      customerUpdate.mockResolvedValue({});

      const result = await service.changeWholesalePassword(customerToken, {
        oldPassword: PASSWORD,
        newPassword: 'YangiParol456!',
      });

      const updateArg = (
        customerUpdate.mock.calls as [
          { data: { mustChangePassword: boolean; passwordHash: string } },
        ][]
      )[0][0];
      expect(updateArg.data.mustChangePassword).toBe(false);
      // Bazaga OCHIQ parol emas, hash yoziladi.
      expect(updateArg.data.passwordHash).not.toBe('YangiParol456!');

      expect(result.mustChangePassword).toBe(false);
      expect(decodeAccess(result.accessToken).mustChangePassword).toBe(false);
    });

    it('joriy parol xato → 401, baza O‘ZGARMAYDI', async () => {
      customerFindUnique.mockResolvedValue(storedCustomer());

      await expect(
        service.changeWholesalePassword(customerToken, {
          oldPassword: 'xato-parol',
          newPassword: 'YangiParol456!',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(customerUpdate).not.toHaveBeenCalled();
    });

    it('yangi parol eskisi bilan bir xil → 400', async () => {
      customerFindUnique.mockResolvedValue(storedCustomer());

      await expect(
        service.changeWholesalePassword(customerToken, {
          oldPassword: PASSWORD,
          newPassword: PASSWORD,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(customerUpdate).not.toHaveBeenCalled();
    });

    it('🔒 xodim tokeni bilan mijoz paroli almashtirilmaydi', async () => {
      await expect(
        service.changeWholesalePassword(
          { sub: 'user-1', type: 'USER', role: 'SUPER_ADMIN' },
          { oldPassword: PASSWORD, newPassword: 'YangiParol456!' },
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(customerFindUnique).not.toHaveBeenCalled();
    });

    it('o‘chirilgan hisob → 401', async () => {
      customerFindUnique.mockResolvedValue({
        ...storedCustomer(),
        isActive: false,
      });

      await expect(
        service.changeWholesalePassword(customerToken, {
          oldPassword: PASSWORD,
          newPassword: 'YangiParol456!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
