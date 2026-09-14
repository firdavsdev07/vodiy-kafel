import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '../../common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  PaginatedResponseDto,
  type PaginatedResult,
} from '../../common/dto/paginated-response.dto';
import { SwaggerTag } from '../../swagger/tags';
import { GalleryPublicItemDto } from './dto';
import { GalleryService } from './gallery.service';

const PaginatedGallery = PaginatedResponseDto(GalleryPublicItemDto);

/** Loyiha galereyasi — OCHIQ (B-024). */
@ApiTags(SwaggerTag.Catalog)
@Controller('gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  @Get()
  @ApiOperation({
    summary: 'Loyiha galereyasi',
    description:
      'Bajarilgan ishlar suratlari. Suratda mahsulot bog‘langan bo‘lsa — ' +
      '`product` (mahsulot sahifasiga havola uchun), aks holda `null`.\n\n' +
      '`sortBy`/`sortOrder` bu yerda ishlatilmaydi — tartibni admin belgilaydi.',
  })
  @ApiDataResponse(PaginatedGallery, { description: 'Sahifalangan galereya' })
  findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<GalleryPublicItemDto>> {
    return this.gallery.findPublic(query);
  }
}
