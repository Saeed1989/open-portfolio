import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IntegrationCache } from '../../schemas/integration-cache.schema';
import { IntegrationConnection } from '../../schemas/integration-connection.schema';

@Injectable()
export class SyncService {
  constructor(
    @InjectModel(IntegrationConnection.name)
    private readonly connections: Model<IntegrationConnection>,
    @InjectModel(IntegrationCache.name)
    private readonly cache: Model<IntegrationCache>,
  ) {}

  /** Refreshes every connection whose interval has elapsed (FR-INT-2). */
  syncDue(): Promise<void> {
    throw new NotImplementedException();
  }
}
