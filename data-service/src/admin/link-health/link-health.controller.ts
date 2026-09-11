import {
  Controller,
  Get,
  NotImplementedException,
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
import { LinkHealthDto } from './dto/link-health.dto';
import { LinkHealthService } from './link-health.service';

@ApiTags('link-health')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'No valid session.' })
@UseGuards(SessionGuard)
@Controller('admin/link-health')
export class LinkHealthController {
  constructor(private readonly linkHealth: LinkHealthService) {}

  @Get()
  @ApiOperation({ summary: 'Link check results (FR-SEC-PROJ-9)' })
  @ApiOkResponse({ type: [LinkHealthDto] })
  list(@Tenant() tenant: TenantScope): Promise<LinkHealthDto[]> {
    throw new NotImplementedException();
  }
}
