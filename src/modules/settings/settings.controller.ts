import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '../../common';
import { SwaggerTag } from '../../swagger/tags';
import { SettingPublicDto } from './dto';
import { SettingsService } from './settings.service';

/** Ochiq sozlamalar (B-025). */
@ApiTags(SwaggerTag.Settings)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('public')
  @ApiOperation({
    summary: 'Ochiq sozlamalar',
    description:
      'Faqat ochiq deb belgilangan kalitlar (masalan bank rekvizitlari). ' +
      'Chegirma chegarasi kabi ichki sozlamalar bu yerda yo‘q.',
  })
  @ApiDataResponse(SettingPublicDto, {
    isArray: true,
    description: 'Kalit–qiymat ro‘yxati',
  })
  findPublic(): Promise<SettingPublicDto[]> {
    return this.settings.findPublic();
  }
}
