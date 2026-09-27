import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { VALIDATION_PIPE_OPTIONS } from '../../../common/validation';
import { UpdateBranchDto } from './branch.dto';

const pipe = new ValidationPipe(VALIDATION_PIPE_OPTIONS);
const run = (value: object) =>
  pipe.transform(value, {
    metatype: UpdateBranchDto,
    type: 'body',
  }) as Promise<UpdateBranchDto>;

/** T-015 · oriyentir. Bo'sh satr — "yo'q" (`null`), bo'sh qator chizilmasin. */
describe('UpdateBranchDto.landmark (T-015)', () => {
  it('chetdagi bo‘shliq olib tashlanadi', async () => {
    expect((await run({ landmark: '  Bozor yonida ' })).landmark).toBe(
      'Bozor yonida',
    );
  });

  it.each([[''], ['   '], [null]])('%j → null (olib tashlash)', async (v) => {
    expect((await run({ landmark: v })).landmark).toBeNull();
  });

  it('berilmasa — tegilmaydi', async () => {
    expect((await run({})).landmark).toBeUndefined();
  });

  it('200 belgidan uzun yoki satr emas — 400', async () => {
    await expect(run({ landmark: 'x'.repeat(201) })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(run({ landmark: 5 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
