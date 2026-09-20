import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { API_KEY_HEADER, USER_ID_HEADER } from '../swagger';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { UploadUrlDto } from './dto/upload-url.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiHeader(USER_ID_HEADER)
@ApiHeader(API_KEY_HEADER)
@ApiUnauthorizedResponse({
  description: 'Missing or invalid API key or user id.',
})
@UseGuards(ApiKeyGuard)
@Controller('admin/media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Issue a signed upload URL (FR-MED-1)' })
  @ApiCreatedResponse({ type: UploadUrlDto })
  createUploadUrl(
    @Tenant() tenant: TenantScope,
    @Body() dto: CreateUploadUrlDto,
  ): Promise<UploadUrlDto> {
    throw new NotImplementedException();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete a media asset of the session's portfolio (FR-TEN-4)",
  })
  @ApiParam({ name: 'id', example: '66e1f0c2a1b2c3d4e5f60718' })
  @ApiNoContentResponse({ description: 'Deleted.' })
  remove(
    @Tenant() tenant: TenantScope,
    @Param('id') id: string,
  ): Promise<void> {
    throw new NotImplementedException();
  }
}
