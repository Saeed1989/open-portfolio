import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LinkHealth } from '../../schemas/link-health.schema';
import { LinkHealthDto } from './dto/link-health.dto';

@Injectable()
export class LinkHealthService {
  constructor(
    @InjectModel(LinkHealth.name)
    private readonly linkHealth: Model<LinkHealth>,
  ) {}

  async list(portfolioId: string | null): Promise<LinkHealthDto[]> {
    if (portfolioId === null)
      throw new NotFoundException('portfolio_not_found');

    const rows = await this.linkHealth
      .find({ portfolioId: new Types.ObjectId(portfolioId) })
      .lean();

    return rows.map((row) => ({
      sectionType: row.sectionType,
      itemId: row.itemId,
      url: row.url,
      state: row.state,
      statusCode: row.statusCode,
      lastCheckedAt: row.lastCheckedAt,
      consecutiveFailures: row.consecutiveFailures ?? 0,
    }));
  }
}
