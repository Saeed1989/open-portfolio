import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LinkHealth } from '../../schemas/link-health.schema';
import { LinkHealthDto } from './dto/link-health.dto';

@Injectable()
export class LinkHealthService {
  constructor(
    @InjectModel(LinkHealth.name)
    private readonly linkHealth: Model<LinkHealth>,
  ) {}

  list(portfolioId: string): Promise<LinkHealthDto[]> {
    throw new NotImplementedException();
  }
}
