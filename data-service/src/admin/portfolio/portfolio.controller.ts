import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import { etag } from '../etag';
import { AllowWithoutPortfolio, UserIdGuard } from '../guards/user-id.guard';
import { PerUserRateLimitGuard } from '../guards/per-user-rate-limit.guard';
import { USER_ID_HEADER } from '../swagger';
import { AdminPortfolioDto } from './dto/admin-portfolio.dto';
import { AdminSeoDto } from './dto/admin-seo.dto';
import { AdminThemeDto } from './dto/admin-theme.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { MeDto } from './dto/me.dto';
import { SlugAvailabilityDto } from './dto/slug-availability.dto';
import { UpdateSlugDto } from './dto/update-slug.dto';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolio')
@ApiHeader(USER_ID_HEADER)
@ApiUnauthorizedResponse({
  description: 'Missing or malformed user id.',
})
@UseGuards(UserIdGuard)
@Controller('admin')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get('me')
  @AllowWithoutPortfolio()
  @ApiOperation({ summary: 'Account behind the current session (FR-AUTH-3)' })
  @ApiOkResponse({ type: MeDto })
  getMe(@Tenant() tenant: TenantScope): Promise<MeDto> {
    return this.portfolio.getMe(tenant.userId);
  }

  @Get('slug-availability')
  @AllowWithoutPortfolio()
  @UseGuards(PerUserRateLimitGuard)
  @ApiOperation({
    summary: 'Whether a slug could be claimed now — advisory only (§7.2)',
  })
  @ApiQuery({ name: 'slug', type: String, required: true })
  @ApiOkResponse({ type: SlugAvailabilityDto })
  @ApiTooManyRequestsResponse({
    description: '30 requests a minute per tenant.',
  })
  slugAvailability(
    @Query('slug') slug: string = '',
  ): Promise<SlugAvailabilityDto> {
    return this.portfolio.slugAvailability(slug);
  }

  @Post('portfolio')
  @AllowWithoutPortfolio()
  @ApiOperation({
    summary: "Create the tenant's portfolio, once (§7.2, FR-AUTH-7)",
  })
  @ApiCreatedResponse({
    type: AdminPortfolioDto,
    description: 'The `ETag` header carries `draftRevision`.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Malformed body or unknown preset; `slug_invalid`; `slug_reserved`.',
  })
  @ApiConflictResponse({ description: '`portfolio_exists`; `slug_taken`.' })
  async create(
    @Tenant() tenant: TenantScope,
    @Body() dto: CreatePortfolioDto,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<AdminPortfolioDto> {
    const created = await this.portfolio.create(
      tenant.userId,
      tenant.portfolioId,
      dto,
    );
    response.setHeader('ETag', etag(created.draftRevision));
    return created;
  }

  @Get('portfolio')
  @ApiOperation({ summary: "Full draft of the session's portfolio (FR-TEN-4)" })
  @ApiOkResponse({
    type: AdminPortfolioDto,
    description: 'The `ETag` header carries `draftRevision`.',
  })
  async getDraft(
    @Tenant() tenant: TenantScope,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<AdminPortfolioDto> {
    const draft = await this.portfolio.getDraft(tenant.portfolioId);
    response.setHeader('ETag', etag(draft.draftRevision));
    return draft;
  }

  @Patch('portfolio/theme')
  @ApiOperation({ summary: 'Update the draft theme (FR-THM-1)' })
  @ApiOkResponse({ type: AdminPortfolioDto })
  updateTheme(
    @Tenant() tenant: TenantScope,
    @Body() dto: AdminThemeDto,
  ): Promise<AdminPortfolioDto> {
    throw new NotImplementedException();
  }

  @Patch('portfolio/seo')
  @ApiOperation({ summary: 'Update the draft SEO fields (FR-PUB-1)' })
  @ApiOkResponse({ type: AdminPortfolioDto })
  updateSeo(
    @Tenant() tenant: TenantScope,
    @Body() dto: AdminSeoDto,
  ): Promise<AdminPortfolioDto> {
    throw new NotImplementedException();
  }

  @Patch('portfolio/slug')
  @ApiOperation({ summary: 'Change the portfolio slug (FR-DAT-1)' })
  @ApiOkResponse({ type: AdminPortfolioDto })
  updateSlug(
    @Tenant() tenant: TenantScope,
    @Body() dto: UpdateSlugDto,
  ): Promise<AdminPortfolioDto> {
    throw new NotImplementedException();
  }
}
