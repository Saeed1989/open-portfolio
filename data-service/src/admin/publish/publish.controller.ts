import {
  Controller,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import { UserIdGuard } from '../guards/user-id.guard';
import { USER_ID_HEADER } from '../swagger';
import { PublishResultDto } from './dto/publish-result.dto';
import { PublishService } from './publish.service';

@ApiTags('publish')
@ApiHeader(USER_ID_HEADER)
@ApiUnauthorizedResponse({
  description: 'Missing or malformed user id.',
})
@UseGuards(UserIdGuard)
@Controller('admin')
export class PublishController {
  constructor(private readonly publishing: PublishService) {}

  @Post('publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate and publish the draft' })
  @ApiOkResponse({ type: PublishResultDto })
  @ApiNotFoundResponse({ description: '`portfolio_not_found`.' })
  @ApiConflictResponse({ description: '`portfolio_suspended`.' })
  @ApiUnprocessableEntityResponse({
    description:
      '`validation_failed`, with every failing field path, or `nothing_to_publish`.',
  })
  publish(@Tenant() tenant: TenantScope): Promise<PublishResultDto> {
    return this.publishing.publish(tenant.portfolioId);
  }

  @Post('unpublish')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Return the subdomain to the 404 state',
  })
  @ApiNoContentResponse({ description: 'Unpublished.' })
  unpublish(@Tenant() tenant: TenantScope): Promise<void> {
    throw new NotImplementedException();
  }
}
