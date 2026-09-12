import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio } from '../../schemas/portfolio.schema';

@Injectable()
export class SitemapService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
  ) {}

  /** XML for a published portfolio; others are excluded (FR-PUB-5). */
  getSitemap(slug: string): Promise<string> {
    throw new NotImplementedException();
  }
}
