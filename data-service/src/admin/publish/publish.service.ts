import { Inject, Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  REVALIDATOR,
  Revalidator,
} from '../../external/revalidator/revalidator';
import { IntegrationCache } from '../../schemas/integration-cache.schema';
import { Portfolio } from '../../schemas/portfolio.schema';
import { PublishResultDto } from './dto/publish-result.dto';

@Injectable()
export class PublishService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
    @InjectModel(IntegrationCache.name)
    private readonly cache: Model<IntegrationCache>,
    @Inject(REVALIDATOR) private readonly revalidator: Revalidator,
  ) {}

  /** SRS §2.3 steps 2–8. */
  publish(portfolioId: string): Promise<PublishResultDto> {
    throw new NotImplementedException();
  }

  unpublish(portfolioId: string): Promise<void> {
    throw new NotImplementedException();
  }
}
