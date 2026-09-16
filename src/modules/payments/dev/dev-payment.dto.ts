import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { PaymentStatus } from '../../../common/enums';

const SIMULATED_STATUSES = [PaymentStatus.PAID, PaymentStatus.FAILED] as const;

export class SimulatePaymentDto {
  @ApiProperty({ enum: SIMULATED_STATUSES, example: PaymentStatus.PAID })
  @IsIn(SIMULATED_STATUSES)
  status!: (typeof SIMULATED_STATUSES)[number];
}

export class SimulatePaymentResponseDto {
  @ApiProperty({ example: 'cmtz0a1b2c3d4e5f6g7h8i9j' })
  paymentId!: string;

  @ApiProperty({ enum: PaymentStatus, description: 'To‘lovning yangi holati' })
  status!: PaymentStatus;

  @ApiProperty({
    enum: ['APPLIED', 'DUPLICATE', 'IGNORED'],
    description:
      'APPLIED — holat o‘zgardi; DUPLICATE — allaqachon shu holatda; ' +
      'IGNORED — to‘lov yakuniy holatda, o‘zgarmaydi',
  })
  outcome!: string;
}
