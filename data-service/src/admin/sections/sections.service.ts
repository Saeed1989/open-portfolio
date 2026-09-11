import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { SectionType } from '@portfolio/registry';
import { Portfolio } from '../../schemas/portfolio.schema';
import { AdminSectionDto } from './dto/admin-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@Injectable()
export class SectionsService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
  ) {}

  list(portfolioId: string): Promise<AdminSectionDto[]> {
    throw new NotImplementedException();
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
