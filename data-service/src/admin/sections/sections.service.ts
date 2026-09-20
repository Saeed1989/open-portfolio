import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { SectionType } from '@portfolio/registry';
import { Portfolio } from '../../schemas/portfolio.schema';
import { AdminSectionDto } from './dto/admin-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Injectable()
export class SectionsService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
  ) {}

  async list(portfolioId: string | null): Promise<AdminSectionDto[]> {
    if (portfolioId === null)
      throw new NotFoundException('portfolio_not_found');

    const portfolio = await this.portfolios
      .findById(new Types.ObjectId(portfolioId))
      .select('draft.sections')
      .lean();
    if (!portfolio) throw new NotFoundException('portfolio_not_found');

    /* Admin sees every section, disabled ones included — only the published
       tree has them removed (FR-TEN-5). */
    return [...(portfolio.draft?.sections ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        type: section.type,
        enabled: section.enabled,
        order: section.order,
        content: section.content ?? {},
      }));
  }

  update(
    portfolioId: string,
    type: SectionType,
    dto: UpdateSectionDto,
  ): Promise<AdminSectionDto> {
    throw new NotImplementedException();
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
