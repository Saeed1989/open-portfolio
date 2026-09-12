import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SlugGuard } from '../guards/slug.guard';
import { RenderPayloadDto } from './dto/render-payload.dto';
import { PortfoliosService } from './portfolios.service';

@ApiTags('portfolios')
@ApiNotFoundResponse({
  description: 'Unknown, unpublished or suspended slug, indistinguishably.',
})
@UseGuards(SlugGuard)
@Controller('public/portfolios')
export class PortfoliosController {
  constructor(private readonly portfolios: PortfoliosService) {}

  @Get(':slug')
  @ApiOperation({
    summary: 'Render payload for a published portfolio (FR-TEN-5)',
  })
  @ApiParam({ name: 'slug', example: 'alice' })
  @ApiOkResponse({ type: RenderPayloadDto })
  getRenderPayload(@Param('slug') slug: string): Promise<RenderPayloadDto> {
    return this.portfolios.getRenderPayload(slug);
  }
}
