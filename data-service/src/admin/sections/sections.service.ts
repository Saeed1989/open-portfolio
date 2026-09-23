import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SECTION_TYPES, type SectionType } from '@portfolio/registry';
import type { TenantScope } from '../../common/decorators/tenant.decorator';
import { DraftSection, Portfolio } from '../../schemas/portfolio.schema';
import {
  AdminSectionDto,
  AdminSectionsDto,
  UpdatedSectionDto,
} from './dto/admin-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { prepareDraftContent, validateDraftContent } from './section-content';
import {
  SectionValidationException,
  StaleWriteException,
} from './sections.exceptions';

@Injectable()
export class SectionsService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
  ) {}

  async list(portfolioId: string | null): Promise<AdminSectionsDto> {
    if (portfolioId === null)
      throw new NotFoundException('portfolio_not_found');

    const portfolio = await this.portfolios
      .findById(new Types.ObjectId(portfolioId))
      .select('draft.sections draftRevision')
      .lean();
    if (!portfolio) throw new NotFoundException('portfolio_not_found');

    /* Admin sees every section, disabled ones included — only the published
       tree has them removed (FR-TEN-5). */
    return {
      draftRevision: portfolio.draftRevision ?? 0,
      sections: [...(portfolio.draft?.sections ?? [])]
        .sort((a, b) => a.order - b.order)
        .map(toAdminSection),
    };
  }

  /**
   * One conditional write, matched on the revision the caller read. A
   * missing `expectedRevision` is refused like a stale one: an update with
   * no precondition could overwrite an edit the caller never saw.
   */
  async update(
    tenant: TenantScope,
    type: string,
    dto: UpdateSectionDto,
    expectedRevision: number | undefined,
  ): Promise<UpdatedSectionDto> {
    if (tenant.portfolioId === null)
      throw new NotFoundException('portfolio_not_found');
    if (!isSectionType(type))
      throw new NotFoundException('section_type_not_found');
    if (dto.enabled === undefined && dto.content === undefined) {
      throw new SectionValidationException([
        { path: '', message: 'Send enabled, content, or both.' },
      ]);
    }

    /* Scope is the header's user id alone (FR-TEN-4, FR-API-3). */
    const userId = new Types.ObjectId(tenant.userId);
    if (expectedRevision === undefined) {
      throw new StaleWriteException(
        await this.currentRevision(userId),
        'If-Match is required.',
      );
    }

    const set: Record<string, unknown> = {};
    if (dto.enabled !== undefined)
      set['draft.sections.$.enabled'] = dto.enabled;
    if (dto.content !== undefined) {
      const errors = validateDraftContent(type, dto.content);
      if (errors.length > 0) throw new SectionValidationException(errors);
      set['draft.sections.$.content'] = prepareDraftContent(type, dto.content);
    }

    const updated = await this.portfolios
      .findOneAndUpdate(
        {
          userId,
          /* A document written before the field existed has none; it reads
             as revision 0 and matches here as one. */
          draftRevision:
            expectedRevision === 0 ? { $in: [0, null] } : expectedRevision,
          'draft.sections.type': type,
        },
        { $set: set, $inc: { draftRevision: 1 } },
        { new: true },
      )
      .select('draft.sections draftRevision')
      .lean();

    if (!updated) {
      /* The one follow-up read: tell a missing portfolio or section apart
         from a revision that moved. */
      const current = await this.portfolios
        .findOne({ userId })
        .select('draft.sections.type draftRevision')
        .lean();
      if (!current) throw new NotFoundException('portfolio_not_found');
      if (!current.draft.sections.some((section) => section.type === type))
        throw new NotFoundException('section_not_found');
      throw new StaleWriteException(
        current.draftRevision ?? 0,
        'The draft changed since it was read.',
      );
    }

    /* Present: the filter matched on it. */
    const section = updated.draft.sections.find(
      (candidate) => candidate.type === type,
    )!;
    return {
      draftRevision: updated.draftRevision,
      section: toAdminSection(section),
    };
  }

  private async currentRevision(userId: Types.ObjectId): Promise<number> {
    const portfolio = await this.portfolios
      .findOne({ userId })
      .select('draftRevision')
      .lean();
    if (!portfolio) throw new NotFoundException('portfolio_not_found');
    return portfolio.draftRevision ?? 0;
  }

  addItem(
    portfolioId: string,
    type: SectionType,
    item: Record<string, unknown>,
  ): Promise<AdminSectionDto> {
    throw new NotImplementedException();
  }

  updateItem(
    portfolioId: string,
    type: SectionType,
    itemId: string,
    item: Record<string, unknown>,
  ): Promise<AdminSectionDto> {
    throw new NotImplementedException();
  }

  removeItem(
    portfolioId: string,
    type: SectionType,
    itemId: string,
  ): Promise<void> {
    throw new NotImplementedException();
  }
}

function toAdminSection(section: DraftSection): AdminSectionDto {
  return {
    type: section.type,
    enabled: section.enabled,
    order: section.order,
    content: section.content ?? {},
  };
}

function isSectionType(type: string): type is SectionType {
  return (SECTION_TYPES as readonly string[]).includes(type);
}
