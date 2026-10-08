import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import { UserIdGuard } from '../guards/user-id.guard';
import { USER_ID_HEADER } from '../swagger';
import { LinkHealthDto } from './dto/link-health.dto';
import { LinkHealthService } from './link-health.service';

@ApiTags('link-health')
@ApiHeader(USER_ID_HEADER)
@ApiUnauthorizedResponse({
  description: 'Missing or malformed user id.',
})
@UseGuards(UserIdGuard)
@Controller('admin/link-health')
export class LinkHealthController {
  constructor(private readonly linkHealth: LinkHealthService) {}

  @Get()
  @ApiOperation({ summary: 'Link check results (FR-SEC-PROJ-9)' })
  @ApiOkResponse({ type: [LinkHealthDto] })
  list(@Tenant() tenant: TenantScope): Promise<LinkHealthDto[]> {
    return this.linkHealth.list(tenant.portfolioId);
  }
}
