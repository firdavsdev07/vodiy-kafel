import { describe, expect, it } from 'vitest';
import { NAV_SECTIONS } from './navigation';
import {
  CABINET_NOTIFICATIONS_PATH,
  CABINET_SECTIONS,
} from './cabinet-navigation';

describe('kabinet navigatsiyasi (D-051)', () => {
  it('task.txt dagi bo‘limlar: Katalog · Savat · Buyurtmalarim · Hisobim · Shartnomalar', () => {
    expect(CABINET_SECTIONS.map((section) => section.title)).toEqual([
      'Katalog',
      'Savat',
      'Buyurtmalarim',
      'Hisobim',
      'Shartnomalar',
    ]);
  });

  it('yo‘l va id noyob, sarlavha bo‘sh emas', () => {
    expect(new Set(CABINET_SECTIONS.map((s) => s.path)).size).toBe(CABINET_SECTIONS.length);
    expect(new Set(CABINET_SECTIONS.map((s) => s.id)).size).toBe(CABINET_SECTIONS.length);
    for (const section of CABINET_SECTIONS) expect(section.title.trim()).not.toBe('');
  });

  it('hamma yo‘l `/kabinet` ostida — xodim marshrutiga chiqmaydi', () => {
    for (const section of [...CABINET_SECTIONS.map((s) => s.path), CABINET_NOTIFICATIONS_PATH]) {
      expect(section === '/kabinet' || section.startsWith('/kabinet/')).toBe(true);
    }
  });

  /**
   * 🔒 D-051 talabi: menyu bandlari ARALASHMAYDI. Mijoz "Mahsulotlar",
   * "Zaxira", "Filiallar" kabi xodim bo'limlarini umuman ko'rmaydi.
   */
  it('🔒 xodim menyusi bilan kesishmaydi', () => {
    const staffPaths = new Set(NAV_SECTIONS.map((section) => section.path));
    for (const section of CABINET_SECTIONS) {
      expect(staffPaths.has(section.path)).toBe(false);
    }
    // Teskarisi ham: xodim yo'llari kabinet ostida emas
    for (const path of staffPaths) {
      expect(path.startsWith('/kabinet')).toBe(false);
    }
  });

  it('bildirishnomalar menyuda emas — u sarlavhadagi qo‘ng‘iroq (D-058)', () => {
    expect(CABINET_SECTIONS.map((s) => s.path)).not.toContain(CABINET_NOTIFICATIONS_PATH);
  });

  it('telefondagi pastki panel 5 banddan oshmaydi', () => {
    expect(CABINET_SECTIONS.filter((s) => s.onPhone).length).toBeLessThanOrEqual(5);
  });
});
