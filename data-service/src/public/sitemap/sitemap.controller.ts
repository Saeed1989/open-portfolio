import {
  Controller,
  Get,
  Header,
  NotImplementedException,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { SlugGuard } from '../guards/slug.guard';
import { SitemapService } from './sitemap.service';

@ApiTags('sitemap')
@ApiNotFoundResponse({
  description: 'Unknown, unpublished or suspended slug, indistinguishably.',
})
@UseGuards(SlugGuard)
@Controller('public/portfolios')
export class SitemapController {
  constructor(private readonly sitemap: SitemapService) {}

  @Get(':slug/sitemap.xml')
  @Header('Content-Type', 'application/xml')
  @ApiOperation({ summary: 'Sitemap for a published portfolio (FR-PUB-5)' })
  @ApiParam({ name: 'slug', example: 'alice' })
  @ApiProduces('application/xml')
  @ApiOkResponse({ description: 'sitemap.xml', schema: { type: 'string' } })
  getSitemap(@Param('slug') slug: string): Promise<string> {
    throw new NotImplementedException();
  }
}
