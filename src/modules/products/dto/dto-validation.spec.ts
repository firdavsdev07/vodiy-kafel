import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ProductAdminQueryDto } from './product-admin-query.dto';
import { UpsertBranchProductDto } from './branch-product.dto';
import { VALIDATION_PIPE_OPTIONS } from '../../../common/validation';

/**
 * DTO'lar main.ts dagi AYNAN shu pipe sozlamalari bilan tekshiriladi
 * (`VALIDATION_PIPE_OPTIONS`).
 */
const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);

const run = <T>(metatype: new () => T, type: 'query' | 'body', value: object) =>
  pipe.transform(value, { metatype, type }) as Promise<T>;

describe('B-021 DTO validatsiyasi (global pipe bilan)', () => {
  describe('ProductAdminQueryDto.isActive', () => {
    it('?isActive=false → false (Boolean("false") → true tuzog‘i)', async () => {
      const dto = await run(ProductAdminQueryDto, 'query', {
        isActive: 'false',
      });
      expect(dto.isActive).toBe(false);
    });

    it('?isActive=true → true', async () => {
      const dto = await run(ProductAdminQueryDto, 'query', {
        isActive: 'true',
      });
      expect(dto.isActive).toBe(true);
    });

    it('berilmasa — undefined (filtr qo‘llanmaydi)', async () => {
      const dto = await run(ProductAdminQueryDto, 'query', {});
      expect(dto.isActive).toBeUndefined();
    });

    it('tanilmagan qiymat — 400', async () => {
      await expect(
        run(ProductAdminQueryDto, 'query', { isActive: 'ha' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('UpsertBranchProductDto.pricePerSqm', () => {
    const body = (pricePerSqm: unknown) => ({ productId: 'p1', pricePerSqm });

    it.each(['85000', '85000.5', '85000.50', '999999999999.99'])(
      '%s — qabul qilinadi',
      async (price) => {
        const dto = await run(UpsertBranchProductDto, 'body', body(price));
        expect(dto.pricePerSqm).toBe(price);
      },
    );

    it.each([
      ['nol', '0'],
      ['nol o‘nlik', '0.00'],
      ['manfiy', '-1'],
      ['3 ta o‘nlik', '1.001'],
      ['13 raqamli butun qism', '1000000000000'],
      ['float xatosi', 0.30000000000000004],
      ['bo‘sh', ''],
    ])('%s — 400', async (_label, price) => {
      await expect(
        run(UpsertBranchProductDto, 'body', body(price)),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
