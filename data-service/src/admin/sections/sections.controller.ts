import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { ServerResponse } from 'node:http';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { SECTION_TYPES, type SectionType } from '@portfolio/registry';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import { etag, parseIfMatch } from '../etag';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { API_KEY_HEADER, USER_ID_HEADER } from '../swagger';
import {
  AdminSectionDto,
  AdminSectionsDto,
  UpdatedSectionDto,
} from './dto/admin-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SectionsService } from './sections.service';

const TYPE_PARAM = { name: 'type', enum: [...SECTION_TYPES] };

const IF_MATCH_HEADER = {
  name: 'If-Match',
  required: true,
  description: 'The ETag of the last read, e.g. "3".',
};

/* An item's fields are declared by the registry for its section type, so the
   body is an open object here rather than a field list (FR-REG-1). */
const ITEM_BODY = {
  description: "One item, shaped by the registry's itemFields for :type.",
  schema: { type: 'object', additionalProperties: true },
} as const;

@ApiTags('sections')
@ApiHeader(USER_ID_HEADER)
@ApiHeader(API_KEY_HEADER)
@ApiUnauthorizedResponse({
  description: 'Missing or invalid API key or user id.',
})
@UseGuards(ApiKeyGuard)
@Controller('admin/portfolio/sections')
export class SectionsController {
  constructor(private readonly sections: SectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List the draft sections (FR-CFG-1)' })
  @ApiOkResponse({
    type: AdminSectionsDto,
    description: 'The `ETag` header carries `draftRevision`.',
  })
  async list(
    @Tenant() tenant: TenantScope,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<AdminSectionsDto> {
    const result = await this.sections.list(tenant.portfolioId);
    response.setHeader('ETag', etag(result.draftRevision));
    return result;
  }

  @Patch(':type')
  @ApiOperation({
    summary: 'Toggle a section or replace its content (FR-CFG-1)',
  })
  @ApiParam(TYPE_PARAM)
  @ApiHeader(IF_MATCH_HEADER)
  @ApiOkResponse({
    type: UpdatedSectionDto,
    description: 'The `ETag` header carries the new `draftRevision`.',
  })
  @ApiBadRequestResponse({ description: '`invalid_if_match`.' })
  @ApiNotFoundResponse({
    description:
      '`portfolio_not_found`, `section_type_not_found`, or `section_not_found`.',
  })
  @ApiConflictResponse({
    description:
      '`stale_write`: If-Match absent or not the current revision. The body carries `draftRevision`.',
  })
  @ApiUnprocessableEntityResponse({
    description: '`validation_failed`, with every failing field path.',
  })
  async update(
    @Tenant() tenant: TenantScope,
    @Param('type') type: string,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() dto: UpdateSectionDto,
    @Res({ passthrough: true }) response: ServerResponse,
  ): Promise<UpdatedSectionDto> {
    const result = await this.sections.update(
      tenant,
      type,
      dto,
      parseIfMatch(ifMatch),
    );
    response.setHeader('ETag', etag(result.draftRevision));
    return result;
  }

  @Post(':type/items')
  @ApiOperation({ summary: 'Add an item to a collection section (FR-API-4)' })
  @ApiParam(TYPE_PARAM)
  @ApiBody(ITEM_BODY)
  @ApiCreatedResponse({ type: AdminSectionDto })
  addItem(
    @Tenant() tenant: TenantScope,
    @Param('type') type: SectionType,
    @Body() item: Record<string, unknown>,
  ): Promise<AdminSectionDto> {
    throw new NotImplementedException();
  }

  @Patch(':type/items/:itemId')
  @ApiOperation({
    summary: 'Update an item in a collection section (FR-API-4)',
  })
  @ApiParam(TYPE_PARAM)
  @ApiParam({ name: 'itemId', example: '66e1f0c2a1b2c3d4e5f60718' })
  @ApiBody(ITEM_BODY)
  @ApiOkResponse({ type: AdminSectionDto })
  updateItem(
    @Tenant() tenant: TenantScope,
    @Param('type') type: SectionType,
    @Param('itemId') itemId: string,
    @Body() item: Record<string, unknown>,
  ): Promise<AdminSectionDto> {
    throw new NotImplementedException();
  }

  @Delete(':type/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove an item from a collection section (FR-API-4)',
  })
  @ApiParam(TYPE_PARAM)
  @ApiParam({ name: 'itemId', example: '66e1f0c2a1b2c3d4e5f60718' })
  @ApiNoContentResponse({ description: 'Removed.' })
  removeItem(
    @Tenant() tenant: TenantScope,
    @Param('type') type: SectionType,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    throw new NotImplementedException();
  }
}
