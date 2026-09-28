import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const BACKUP_PROVIDERS = ['off', 'file', 'google'] as const;
export const BACKUP_RESULTS = ['SENT', 'UNCHANGED', 'FAILED'] as const;

export class BackupTableStatusDto {
  @ApiProperty({ example: 'orders' })
  name!: string;

  @ApiProperty({ example: 128 })
  rows!: number;
}

export class BackupStatusDto {
  @ApiProperty({
    enum: BACKUP_PROVIDERS,
    description:
      '`off` — o‘chiq, `file` — mahalliy CSV, `google` — Google Sheets',
    example: 'google',
  })
  provider!: (typeof BACKUP_PROVIDERS)[number];

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: 15, description: 'Necha daqiqada bir nusxa olinadi' })
  intervalMinutes!: number;

  @ApiPropertyOptional({
    nullable: true,
    type: String,
    description: 'Spreadsheet havolasi yoki serverdagi papka',
    example: 'https://docs.google.com/spreadsheets/d/1AbC…',
  })
  target!: string | null;

  @ApiProperty({ description: 'Hozir nusxa olinmoqda', example: false })
  running!: boolean;

  @ApiPropertyOptional({ nullable: true, type: Date })
  lastRunAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    type: Date,
    description: 'Oxirgi xatosiz tugagan urinish',
  })
  lastSuccessAt!: Date | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: BACKUP_RESULTS,
    description:
      '`SENT` — yuborildi, `UNCHANGED` — ma’lumot o‘zgarmagan, yuborish shart emas edi, `FAILED` — xato',
  })
  lastResult!: (typeof BACKUP_RESULTS)[number] | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  lastError!: string | null;

  @ApiPropertyOptional({ nullable: true, type: Date })
  nextRunAt!: Date | null;

  @ApiProperty({
    type: [BackupTableStatusDto],
    description: 'Oxirgi nusxadagi jadvallar',
  })
  tables!: BackupTableStatusDto[];
}
