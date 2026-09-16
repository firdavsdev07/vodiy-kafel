import { Prisma } from '../../prisma/prisma-client';

/**
 * So'mda pul bilan ishlash uchun arifmetika. Formatlash (masalan
 * "1 234 567 so'm" ko'rinishiga keltirish) YO'Q — bu frontend zimmasida
 * (CLAUDE.md, "Pul va vaqt"). Bu yerda faqat `Decimal` bilan xavfsiz
 * qo'shish/ayirish/ko'paytirish — hech qachon `number`/`float` emas
 * (CLAUDE.md, qoida 7).
 *
 * Decimal.js immutable — har bir funksiya YANGI nusxa qaytaradi,
 * argumentlarni o'zgartirmaydi.
 */
export type Money = Prisma.Decimal;

/** Har qanday qiymatdan (son, satr, Decimal) Money yasaydi. */
export const toMoney = (value: Prisma.Decimal.Value): Money =>
  new Prisma.Decimal(value);

export const ZERO_MONEY: Money = toMoney(0);

export const addMoney = (
  a: Prisma.Decimal.Value,
  b: Prisma.Decimal.Value,
): Money => toMoney(a).add(toMoney(b));

export const subtractMoney = (
  a: Prisma.Decimal.Value,
  b: Prisma.Decimal.Value,
): Money => toMoney(a).sub(toMoney(b));

/** Masalan: bitta paddon narxi × paddonlar soni. */
export const multiplyMoney = (
  a: Prisma.Decimal.Value,
  factor: Prisma.Decimal.Value,
): Money => toMoney(a).mul(toMoney(factor));

/** Buyurtma qatorlari yig'indisi kabi hollar uchun. */
export const sumMoney = (values: Prisma.Decimal.Value[]): Money =>
  values.reduce<Money>((total, value) => total.add(toMoney(value)), ZERO_MONEY);

export const isPositiveMoney = (value: Prisma.Decimal.Value): boolean =>
  toMoney(value).gt(0);

export const isZeroMoney = (value: Prisma.Decimal.Value): boolean =>
  toMoney(value).isZero();

export const moneyEquals = (
  a: Prisma.Decimal.Value,
  b: Prisma.Decimal.Value,
): boolean => toMoney(a).equals(toMoney(b));
