import {
  Controller,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import { SessionGuard } from '../guards/session.guard';
import { PublishResultDto } from './dto/publish-result.dto';
import { PublishService } from './publish.service';

@ApiTags('publish')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'No valid session.' })
@UseGuards(SessionGuard)
@Controller('admin')
export class PublishController {
  constructor(private readonly publishing: PublishService) {}

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate and publish the draft (FR-PUB-6)' })
  @ApiOkResponse({ type: PublishResultDto })
  publish(@Tenant() tenant: TenantScope): Promise<PublishResultDto> {
    throw new NotImplementedException();
  }

  @Post('unpublish')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Return the subdomain to the 404 state (FR-PUB-8)',
  })
  @ApiNoContentResponse({ description: 'Unpublished.' })
  unpublish(@Tenant() tenant: TenantScope): Promise<void> {
    throw new NotImplementedException();
  }
}
