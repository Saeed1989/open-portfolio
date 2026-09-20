import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SECTION_TYPES, type SectionType } from '@portfolio/registry';
import { Tenant, TenantScope } from '../../common/decorators/tenant.decorator';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { API_KEY_HEADER, USER_ID_HEADER } from '../swagger';
import { AdminSectionDto } from './dto/admin-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { SectionsService } from './sections.service';

const TYPE_PARAM = { name: 'type', enum: [...SECTION_TYPES] };

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
  @ApiOkResponse({ type: [AdminSectionDto] })
  list(@Tenant() tenant: TenantScope): Promise<AdminSectionDto[]> {
    throw new NotImplementedException();
  }

  @Patch(':type')
  @ApiOperation({
    summary: "Toggle, reorder, or replace a section's content (FR-CFG-3)",
  })
  @ApiParam(TYPE_PARAM)
  @ApiOkResponse({ type: AdminSectionDto })
  update(
    @Tenant() tenant: TenantScope,
    @Param('type') type: SectionType,
    @Body() dto: UpdateSectionDto,
  ): Promise<AdminSectionDto> {
    throw new NotImplementedException();
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
