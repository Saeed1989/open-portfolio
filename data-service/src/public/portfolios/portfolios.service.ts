import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio } from '../../schemas/portfolio.schema';
import { RenderPayloadDto } from './dto/render-payload.dto';

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
  ) {}

  /**
   * One find on `portfolios`, projecting `published.config` and
   * `published.data`, and no outbound HTTP (§2.2, NFR-PERF-3).
   */
  getRenderPayload(slug: string): Promise<RenderPayloadDto> {
    throw new NotImplementedException();
  }
}
