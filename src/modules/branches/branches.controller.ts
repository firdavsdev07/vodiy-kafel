import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiDataResponse } from '../../common';
import { ApiErrorDto } from '../../common/dto/api-error.dto';
import { SwaggerTag } from '../../swagger/tags';
import { BranchesService } from './branches.service';
import { BranchPublicDto } from './dto/branch.dto';

/**
 * Filiallar — ochiq (B-041, TZ 3.7): kartalar, xarita nuqtasi, Telegram va
 * Instagram tugmalari. Token talab qilinmaydi.
 */
@ApiTags(SwaggerTag.Branches)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  @ApiOperation({
    summary: 'Filiallar ro‘yxati',
    description:
      'Faqat faol do‘konlar (markaziy ombor ko‘rsatilmaydi). Tartib — admin ' +
      'belgilagan `sortOrder`.',
  })
  @ApiDataResponse(BranchPublicDto, { isArray: true, description: 'Filiallar' })
  findAll(): Promise<BranchPublicDto[]> {
    return this.branches.findAllPublic();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Filial kartasi' })
  @ApiParam({ name: 'id', description: 'Filial ID' })
  @ApiDataResponse(BranchPublicDto, { description: 'Filial' })
  @ApiNotFoundResponse({
    description: 'Topilmadi, yopilgan yoki do‘kon emas',
    type: ApiErrorDto,
  })
  findOne(@Param('id') id: string): Promise<BranchPublicDto> {
    return this.branches.findOnePublic(id);
  }
}
