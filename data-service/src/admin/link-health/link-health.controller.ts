import {
  Controller,
  Get,
  NotImplementedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { API_KEY_HEADER, USER_ID_HEADER } from '../swagger';
import { LinkHealthDto } from './dto/link-health.dto';
import { LinkHealthService } from './link-health.service';

@ApiTags('link-health')
@ApiHeader(USER_ID_HEADER)
@ApiHeader(API_KEY_HEADER)
@ApiUnauthorizedResponse({
  description: 'Missing or invalid API key or user id.',
})
@UseGuards(ApiKeyGuard)
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
