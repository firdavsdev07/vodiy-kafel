import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { Actor } from '../common/types/actor';
import { BranchScopeService } from './branch-scope.service';

/**
 * B-051 · filial izolyatsiyasi. Bu testlar butun loyihaning eng muhim
 * xavfsizlik qoidasini qo'riqlaydi: "Andijon admini Farg'ona narxini
 * ko'rmaydi". Shuning uchun har bir rol alohida tekshiriladi.
 */
describe('BranchScopeService (B-051)', () => {
  const service = new BranchScopeService();

  const FARGONA = 'branch-fargona';
  const ANDIJON = 'branch-andijon';
  const MARKAZ = 'branch-markaz';

  const superAdmin: Actor = {
    id: 'u1',
    type: 'USER',
    role: 'SUPER_ADMIN',
    branchId: null,
  };
  const branchAdmin: Actor = {
    id: 'u2',
    type: 'USER',
    role: 'BRANCH_ADMIN',
    branchId: FARGONA,
  };
  const manager: Actor = {
    id: 'u3',
    type: 'USER',
    role: 'MANAGER',
    branchId: FARGONA,
  };
  const moderator: Actor = {
    id: 'u4',
    type: 'USER',
    role: 'MODERATOR',
    branchId: MARKAZ,
  };
  const customer: Actor = { id: 'c1', type: 'CUSTOMER', branchId: FARGONA };

  describe('resolve', () => {
    it('mehmon (token yo‘q) → NONE', () => {
      expect(service.resolve(undefined)).toEqual({ kind: 'NONE' });
    });

    it('SUPER_ADMIN, filial so‘ralmagan → ALL', () => {
      expect(service.resolve(superAdmin)).toEqual({ kind: 'ALL' });
    });

    it('SUPER_ADMIN istalgan filialni so‘rashi mumkin', () => {
      expect(service.resolve(superAdmin, ANDIJON)).toEqual({
        kind: 'SINGLE',
        branchId: ANDIJON,
      });
    });

    it.each([
      ['BRANCH_ADMIN', branchAdmin],
      ['MANAGER', manager],
      ['CUSTOMER', customer],
    ])('%s → faqat o‘z filiali', (_nom, actor) => {
      expect(service.resolve(actor)).toEqual({
        kind: 'SINGLE',
        branchId: FARGONA,
      });
    });

    it('MODERATOR → faqat o‘z CENTRAL filiali', () => {
      expect(service.resolve(moderator)).toEqual({
        kind: 'SINGLE',
        branchId: MARKAZ,
      });
    });

    it.each([
      ['BRANCH_ADMIN', branchAdmin],
      ['MANAGER', manager],
      ['MODERATOR', moderator],
      ['CUSTOMER', customer],
    ])('🔒 %s BEGONA filialni so‘rasa → 404', (_nom, actor) => {
      expect(() => service.resolve(actor, ANDIJON)).toThrow(NotFoundException);
    });

    it('o‘z filialini ochiq so‘rash — ruxsat', () => {
      expect(service.resolve(branchAdmin, FARGONA)).toEqual({
        kind: 'SINGLE',
        branchId: FARGONA,
      });
    });

    it('🔒 mijozda SUPER_ADMIN roli bo‘lsa ham cheklov saqlanadi', () => {
      // Mijoz tokenida rol umuman yo'q, lekin tekshiruv faqat rolga
      // qarab qolsa, kelajakda mijozga rol qo'shilishi bilan bu joy
      // jimgina ochilib ketardi. Shuning uchun `type` ham tekshiriladi.
      const soxta: Actor = {
        id: 'c2',
        type: 'CUSTOMER',
        role: 'SUPER_ADMIN',
        branchId: FARGONA,
      };

      expect(service.resolve(soxta)).toEqual({
        kind: 'SINGLE',
        branchId: FARGONA,
      });
      expect(() => service.resolve(soxta, ANDIJON)).toThrow(NotFoundException);
    });

    it('🔒 filialsiz cheklangan rol → 404 (hammasi EMAS)', () => {
      const buzuq: Actor = {
        id: 'u9',
        type: 'USER',
        role: 'MANAGER',
        branchId: null,
      };
      expect(() => service.resolve(buzuq)).toThrow(NotFoundException);
    });
  });

  describe('assertWithinScope', () => {
    it('SUPER_ADMIN — har qanday filial resursi', () => {
      expect(() =>
        service.assertWithinScope(superAdmin, ANDIJON),
      ).not.toThrow();
    });

    it('o‘z filiali resursi — ruxsat', () => {
      expect(() =>
        service.assertWithinScope(branchAdmin, FARGONA),
      ).not.toThrow();
    });

    it('🔒 begona filial resursi → 404', () => {
      expect(() => service.assertWithinScope(branchAdmin, ANDIJON)).toThrow(
        NotFoundException,
      );
    });

    it('🔒 mehmon → 404', () => {
      expect(() => service.assertWithinScope(undefined, FARGONA)).toThrow(
        NotFoundException,
      );
    });

    it('xabar matnini chaqiruvchi belgilaydi (resurs nomi uchun)', () => {
      expect(() =>
        service.assertWithinScope(branchAdmin, ANDIJON, 'Mijoz topilmadi'),
      ).toThrow('Mijoz topilmadi');
    });
  });

  describe('toPrismaFilter', () => {
    it('ALL → filtrsiz', () => {
      expect(service.toPrismaFilter({ kind: 'ALL' })).toEqual({});
    });

    it('SINGLE → branchId filtri', () => {
      expect(
        service.toPrismaFilter({ kind: 'SINGLE', branchId: FARGONA }),
      ).toEqual({ branchId: FARGONA });
    });

    it('🔒 NONE → rad etadi (bo‘sh filtr QAYTARMAYDI)', () => {
      // Eng xavfli xato shu bo'lardi: mehmon uchun {} qaytsa, butun
      // baza ochilib ketardi.
      expect(() => service.toPrismaFilter({ kind: 'NONE' })).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('requireBranchId', () => {
    it('cheklangan rol — o‘z filiali', () => {
      expect(service.requireBranchId(branchAdmin)).toBe(FARGONA);
    });

    it('🔒 cheklangan rol begona filialga yozolmaydi → 404', () => {
      expect(() => service.requireBranchId(branchAdmin, ANDIJON)).toThrow(
        NotFoundException,
      );
    });

    it('SUPER_ADMIN filialni ANIQ ko‘rsatishi shart → 400', () => {
      // "Hammasi" degan filialga yozib bo'lmaydi.
      expect(() => service.requireBranchId(superAdmin)).toThrow(
        BadRequestException,
      );
    });

    it('SUPER_ADMIN ko‘rsatgan filialga yozadi', () => {
      expect(service.requireBranchId(superAdmin, ANDIJON)).toBe(ANDIJON);
    });

    it('🔒 mehmon yozolmaydi', () => {
      expect(() => service.requireBranchId(undefined)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('CUSTOMERS domeni (T-001 — moderator optom mijozlarni boshqaradi)', () => {
    it('MODERATOR → barcha filial mijozlari', () => {
      expect(service.resolve(moderator, undefined, 'CUSTOMERS')).toEqual({
        kind: 'ALL',
      });
    });

    it('MODERATOR ko‘rsatgan RETAIL filial bo‘yicha filtrlaydi', () => {
      expect(service.resolve(moderator, FARGONA, 'CUSTOMERS')).toEqual({
        kind: 'SINGLE',
        branchId: FARGONA,
      });
    });

    it('MODERATOR begona filial mijoziga yetadi', () => {
      expect(() =>
        service.assertWithinScope(moderator, ANDIJON, 'x', 'CUSTOMERS'),
      ).not.toThrow();
    });

    it('MODERATOR mijozni RETAIL filialga yaratadi, filialni aniq beradi', () => {
      expect(service.requireBranchId(moderator, FARGONA, 'CUSTOMERS')).toBe(
        FARGONA,
      );
      expect(() =>
        service.requireBranchId(moderator, undefined, 'CUSTOMERS'),
      ).toThrow(BadRequestException);
    });

    it('🔒 oddiy domenda MODERATOR avvalgidek faqat o‘z filialida', () => {
      expect(() => service.assertWithinScope(moderator, ANDIJON)).toThrow(
        NotFoundException,
      );
    });

    it.each([
      ['BRANCH_ADMIN', branchAdmin],
      ['MANAGER', manager],
      ['CUSTOMER', customer],
    ])(
      '🔒 %s uchun CUSTOMERS domeni hech narsani kengaytirmaydi',
      (_, actor) => {
        expect(() =>
          service.assertWithinScope(actor, ANDIJON, 'x', 'CUSTOMERS'),
        ).toThrow(NotFoundException);
        expect(service.resolve(actor, undefined, 'CUSTOMERS')).toEqual({
          kind: 'SINGLE',
          branchId: FARGONA,
        });
      },
    );
  });
});
