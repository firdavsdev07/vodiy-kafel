import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '../common/enums';
import type { Actor } from '../common/types/actor';

/**
 * Subyekt qaysi filial(lar)ni ko'rishi mumkinligi.
 *
 * Ataylab UCH holatli tur — oddiy `string | null` emas. `null = hammasi`
 * bo'lganda chaqiruvchi `null` ni e'tibordan chetda qoldirsa, so'rov
 * FILTRSIZ ketardi va Andijon admini Farg'ona narxini ko'rardi. Bu yerda
 * har bir holat nomlangan, TypeScript esa uchalasini ham qarashga majbur.
 */
export type BranchScope =
  /** SUPER_ADMIN — cheklov yo'q. */
  | { kind: 'ALL' }
  /** Bitta filial: xodim, moderator yoki optom mijoz. */
  | { kind: 'SINGLE'; branchId: string }
  /** Mehmon — filial konteksti umuman yo'q (narx ko'rmaydi). */
  | { kind: 'NONE' };

/**
 * Begona resurs uchun YAGONA javob.
 *
 * 🔒 403 EMAS, 404: "sizga ruxsat yo'q" degan javob bunday ID mavjudligini
 *    tasdiqlaydi va raqiblar ro'yxatini sanab chiqish imkonini beradi
 *    (CLAUDE.md qoida 5 va 6).
 */
const NOT_FOUND = 'Topilmadi';

/**
 * Filial izolyatsiyasining YAGONA joyi (B-051).
 *
 * Muammo: "bu foydalanuvchi qaysi filialni ko'radi?" tekshiruvini har bir
 * servisda qo'lda yozish — bitta joyda unutilsa izolyatsiya buziladi va buni
 * hech kim sezmaydi. Shuning uchun qoida SHU YERDA, bitta nusxada.
 *
 * ⚠ Zaxira (`ProductStock`) bu qamrovga KIRMAYDI — u filialga bog'lanmagan,
 *   butun tizim uchun bitta umumiy son (B-008, TZ 3.2). Qamrov: narx,
 *   mijozlar, buyurtmalar, to'lovlar, balans, xodimlar, bildirishnomalar.
 */
@Injectable()
export class BranchScopeService {
  /**
   * Subyekt uchun filial doirasini aniqlaydi.
   *
   * @param requestedBranchId So'rovda ko'rsatilgan filial (masalan
   *   SUPER_ADMIN uchun `?branchId=...` filtri). Cheklangan rol o'zinikidan
   *   boshqasini so'rasa — 404.
   */
  resolve(actor: Actor | undefined, requestedBranchId?: string): BranchScope {
    if (!actor) return { kind: 'NONE' };

    if (this.isUnscoped(actor)) {
      return requestedBranchId
        ? { kind: 'SINGLE', branchId: requestedBranchId }
        : { kind: 'ALL' };
    }

    // Cheklangan rol — filialsiz bo'lishi mumkin emas (baza CHECK bilan
    // qulflangan, B-006). Lekin token eski bo'lishi mumkin: "filial yo'q"
    // hech qachon "hammasi ko'rinadi" degani EMAS.
    if (!actor.branchId) throw new NotFoundException(NOT_FOUND);

    if (requestedBranchId && requestedBranchId !== actor.branchId) {
      throw new NotFoundException(NOT_FOUND);
    }

    return { kind: 'SINGLE', branchId: actor.branchId };
  }

  /**
   * Allaqachon o'qilgan resurs subyektning doirasidami — tekshiradi.
   * Bitta resursli endpointlar (`GET/PATCH /admin/customers/:id`) uchun.
   *
   * @param notFoundMessage Foydalanuvchiga ko'rinadigan matn. U begona
   *   resurs uchun ham, umuman mavjud bo'lmagani uchun ham BIR XIL
   *   bo'lishi shart — aks holda farq ma'lumot sizdiradi.
   */
  assertWithinScope(
    actor: Actor | undefined,
    resourceBranchId: string,
    notFoundMessage: string = NOT_FOUND,
  ): void {
    const scope = this.resolve(actor);

    if (scope.kind === 'ALL') return;
    if (scope.kind === 'SINGLE' && scope.branchId === resourceBranchId) return;

    throw new NotFoundException(notFoundMessage);
  }

  /**
   * Prisma `where` ga qo'shiladigan filtr.
   *
   *   const scope = this.branchScope.resolve(actor);
   *   await prisma.order.findMany({
   *     where: { ...this.branchScope.toPrismaFilter(scope), status: 'NEW' },
   *   });
   *
   * ⚠ `ALL` uchun bo'sh obyekt qaytadi — bu FAQAT SUPER_ADMIN uchun to'g'ri.
   *   Shuning uchun filtrni `resolve()` siz, qo'lda yasab bo'lmaydi.
   */
  toPrismaFilter(scope: BranchScope): { branchId?: string } {
    switch (scope.kind) {
      case 'ALL':
        return {};
      case 'SINGLE':
        return { branchId: scope.branchId };
      case 'NONE':
        // Mehmon filialga bog'liq ma'lumot so'ramaydi. Bu yerga yetib
        // kelinsa — endpoint guard'siz qolgan. Bo'sh filtr qaytarish
        // butun bazani ochib yuborardi, shuning uchun rad etamiz.
        throw new ForbiddenException('Bu ma’lumot uchun kirish talab etiladi');
    }
  }

  /**
   * Yozish uchun filial ID si — yangi resurs qaysi filialga tegishli.
   *
   * Cheklangan rol uchun har doim O'Z filiali (so'rovdagi qiymat
   * e'tiborga olinmaydi va mos kelmasa 404). SUPER_ADMIN esa filialni
   * ANIQ ko'rsatishi shart: "hammasi" degan filialga yozib bo'lmaydi.
   */
  requireBranchId(
    actor: Actor | undefined,
    requestedBranchId?: string,
  ): string {
    const scope = this.resolve(actor, requestedBranchId);

    if (scope.kind === 'SINGLE') return scope.branchId;
    if (scope.kind === 'ALL') {
      throw new BadRequestException('branchId ko‘rsatilishi shart');
    }
    throw new ForbiddenException('Bu amal uchun kirish talab etiladi');
  }

  /**
   * Cheklovsiz subyekt — faqat SUPER_ADMIN.
   *
   * 🔒 `type === 'USER'` sharti ham MAJBURIY: mijoz tokenida rol umuman
   *    yo'q, lekin tekshiruv faqat rolga qarab qolsa, kelajakda mijozga
   *    biror rol qo'shilishi bilan bu joy jimgina ochilib ketardi.
   */
  private isUnscoped(actor: Actor): boolean {
    return actor.type === 'USER' && actor.role === UserRole.SUPER_ADMIN;
  }
}
