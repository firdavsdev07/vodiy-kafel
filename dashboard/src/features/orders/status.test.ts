import { describe, expect, it } from 'vitest';
import { statusActions, statusNoteSchema, toChangeStatusBody } from './status';

describe('buyurtma holati (D-026)', () => {
  it('G8: tugmalar faqat allowedNextStatuses dan — bekor qilish alohida', () => {
    expect(statusActions(['LOADING', 'CANCELLED'])).toEqual({ forward: ['LOADING'], canCancel: true });
    expect(statusActions(['DELIVERED'])).toEqual({ forward: ['DELIVERED'], canCancel: false });
    // yakuniy holat — hech narsa
    expect(statusActions([])).toEqual({ forward: [], canCancel: false });
  });

  it('bekor qilishda sabab majburiy; boshqa o‘tishda ixtiyoriy', () => {
    expect(statusNoteSchema('CANCELLED').safeParse({ note: '  ' }).success).toBe(false);
    expect(statusNoteSchema('CANCELLED').safeParse({ note: 'Mijoz rad etdi' }).success).toBe(true);
    expect(statusNoteSchema('LOADING').safeParse({ note: '' }).success).toBe(true);
    expect(statusNoteSchema('LOADING').safeParse({ note: 'x'.repeat(501) }).success).toBe(false);
  });

  it('bo‘sh izoh yuborilmaydi, izoh kesiladi', () => {
    expect(toChangeStatusBody('LOADING', statusNoteSchema('LOADING').parse({ note: '   ' }))).toEqual({ status: 'LOADING' });
    expect(toChangeStatusBody('CANCELLED', statusNoteSchema('CANCELLED').parse({ note: ' Rad etdi ' }))).toEqual({
      status: 'CANCELLED',
      note: 'Rad etdi',
    });
  });
});
