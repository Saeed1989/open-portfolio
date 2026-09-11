import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import { SessionGuard } from '../guards/session.guard';
import { AdminPortfolioDto } from './dto/admin-portfolio.dto';
import { AdminSeoDto } from './dto/admin-seo.dto';
import { AdminThemeDto } from './dto/admin-theme.dto';
import { MeDto } from './dto/me.dto';
import { UpdateSlugDto } from './dto/update-slug.dto';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolio')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'No valid session.' })
@UseGuards(SessionGuard)
@Controller('admin')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get('me')
  @ApiOperation({ summary: 'Account behind the current session (FR-AUTH-3)' })
  @ApiOkResponse({ type: MeDto })
  getMe(@Tenant() tenant: TenantScope): Promise<MeDto> {
    throw new NotImplementedException();
  }

  @Get('portfolio')
  @ApiOperation({ summary: "Full draft of the session's portfolio (FR-TEN-4)" })
  @ApiOkResponse({ type: AdminPortfolioDto })
  getDraft(@Tenant() tenant: TenantScope): Promise<AdminPortfolioDto> {
    throw new NotImplementedException();
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
