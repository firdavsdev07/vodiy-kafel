import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '../../common';
import { SwaggerTag } from '../../swagger/tags';
import { PartnerPublicDto } from './dto/partner.dto';
import { PartnersService } from './partners.service';

/** "Hamkorlarimiz" sahifasi — OCHIQ (B-042, TZ 3.8). */
@ApiTags(SwaggerTag.Partners)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  @ApiOperation({
    summary: 'Hamkorlar',
    description: 'Faol hamkorlar — admin belgilagan tartibda.',
  })
  @ApiDataResponse(PartnerPublicDto, {
    isArray: true,
    description: 'Hamkorlar',
  })
  findAll(): Promise<PartnerPublicDto[]> {
    return this.partners.findPublic();
  }
}
