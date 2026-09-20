import {
  Controller,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { PublishResultDto } from './dto/publish-result.dto';
import { PublishService } from './publish.service';

@ApiTags('publish')
@ApiSecurity('api-key')
@ApiUnauthorizedResponse({
  description: 'Missing or invalid API key or user id.',
})
@UseGuards(ApiKeyGuard)
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
