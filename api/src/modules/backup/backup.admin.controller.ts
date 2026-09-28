import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators';
import { JwtAuthGuard, RolesGuard } from '../../auth/guards';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { UserRole } from '../../common/enums';
import { BEARER_AUTH, SwaggerTag } from '../../swagger/tags';
import { BackupService } from './backup.service';
import { BackupStatusDto } from './dto';

/**
 * Zaxira nusxa (T-018). 🔒 Faqat SUPER_ADMIN: nusxada barcha filiallarning
 * mijozlari, balanslari va buyurtmalari bor.
 */
@ApiTags(SwaggerTag.Admin)
@Controller('admin/backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth(BEARER_AUTH)
@ApiForbiddenResponse({ description: 'Faqat SUPER_ADMIN', type: ApiErrorDto })
export class BackupAdminController {
  constructor(private readonly backup: BackupService) {}

  @Get()
  @ApiOperation({
    summary: 'Zaxira nusxa holati',
    description:
      'Qaysi provayder, qayerga, oxirgi urinish natijasi va har jadvaldagi qatorlar soni.',
  })
  @ApiDataResponse(BackupStatusDto, { description: 'Holat' })
  status(): BackupStatusDto {
    return this.backup.status();
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Hozir nusxa olish',
    description:
      'Jadvalni kutmasdan barcha jadvallarni darhol yuboradi (o‘zgarmagan bo‘lsa ham). ' +
      'Nusxa allaqachon olinayotgan bo‘lsa — o‘shaning tugashini kutadi. Xato bo‘lsa ' +
      'ham 200: natija `lastResult` / `lastError` da. Provayder `off` bo‘lsa hech narsa qilmaydi.',
  })
  @ApiDataResponse(BackupStatusDto, { description: 'Urinishdan keyingi holat' })
  run(): Promise<BackupStatusDto> {
    return this.backup.run({ force: true });
  }
}
