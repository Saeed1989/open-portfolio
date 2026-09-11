import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LinkHealth } from '../../schemas/link-health.schema';

@Injectable()
export class LinkHealthCheckService {
  constructor(
    @InjectModel(LinkHealth.name)
    private readonly linkHealth: Model<LinkHealth>,
  ) {}

  /** Checks every project link due for its weekly check (FR-SEC-PROJ-9). */
  checkDue(): Promise<void> {
    throw new NotImplementedException();
  }
}
