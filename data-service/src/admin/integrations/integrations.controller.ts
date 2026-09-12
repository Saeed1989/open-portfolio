import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from '../../schemas/integration-connection.schema';
import { SessionGuard } from '../guards/session.guard';
import { AdminSectionDto } from '../sections/dto/admin-section.dto';
import { ConnectIntegrationDto } from './dto/connect-integration.dto';
import { CredlyBadgeDto } from './dto/credly-badge.dto';
import { CredlyImportDto } from './dto/credly-import.dto';
import { IntegrationDto } from './dto/integration.dto';
import { IntegrationsService } from './integrations.service';

const PROVIDER_PARAM = { name: 'provider', enum: [...INTEGRATION_PROVIDERS] };

@ApiTags('integrations')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'No valid session.' })
@UseGuards(SessionGuard)
@Controller('admin/integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List connections with status and cached payload (FR-INT-3)',
  })
  @ApiOkResponse({ type: [IntegrationDto] })
  list(@Tenant() tenant: TenantScope): Promise<IntegrationDto[]> {
    throw new NotImplementedException();
  }

  @Post('credly/import')
  @ApiOperation({
    summary: 'Populate achievements from a public Credly profile (FR-INT-13)',
  })
  @ApiCreatedResponse({ type: AdminSectionDto })
  importCredly(
    @Tenant() tenant: TenantScope,
    @Body() dto: CredlyImportDto,
  ): Promise<AdminSectionDto> {
    throw new NotImplementedException();
  }

  @Post('credly/badge')
  @ApiOperation({
    summary: 'Add one badge from a pasted Credly embed code (FR-INT-14)',
  })
  @ApiCreatedResponse({ type: AdminSectionDto })
  addCredlyBadge(
    @Tenant() tenant: TenantScope,
    @Body() dto: CredlyBadgeDto,
  ): Promise<AdminSectionDto> {
    throw new NotImplementedException();
  }

  @Post(':provider')
  @ApiOperation({ summary: 'Connect an integration provider (FR-INT-2)' })
  @ApiParam(PROVIDER_PARAM)
  @ApiCreatedResponse({ type: IntegrationDto })
  connect(
    @Tenant() tenant: TenantScope,
    @Param('provider') provider: IntegrationProvider,
    @Body() dto: ConnectIntegrationDto,
  ): Promise<IntegrationDto> {
    throw new NotImplementedException();
  }

  @Post(':provider/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request a manual refresh (FR-INT-2)' })
  @ApiParam(PROVIDER_PARAM)
  @ApiAcceptedResponse({ description: 'Refresh handed to the sync worker.' })
  requestSync(
    @Tenant() tenant: TenantScope,
    @Param('provider') provider: IntegrationProvider,
  ): Promise<void> {
    throw new NotImplementedException();
  }

  @Delete(':provider')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect an integration provider (FR-INT-6)' })
  @ApiParam(PROVIDER_PARAM)
  @ApiNoContentResponse({ description: 'Disconnected.' })
  disconnect(
    @Tenant() tenant: TenantScope,
    @Param('provider') provider: IntegrationProvider,
  ): Promise<void> {
    throw new NotImplementedException();
  }
}
