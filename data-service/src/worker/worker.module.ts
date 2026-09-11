import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  IntegrationCache,
  IntegrationCacheSchema,
} from '../schemas/integration-cache.schema';
import {
  IntegrationConnection,
  IntegrationConnectionSchema,
} from '../schemas/integration-connection.schema';
import { LinkHealth, LinkHealthSchema } from '../schemas/link-health.schema';
import { LinkHealthCheckService } from './link-health/link-health-check.service';
import { SyncService } from './sync/sync.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IntegrationConnection.name, schema: IntegrationConnectionSchema },
      { name: IntegrationCache.name, schema: IntegrationCacheSchema },
      { name: LinkHealth.name, schema: LinkHealthSchema },
    ]),
  ],
  providers: [SyncService, LinkHealthCheckService],
})
export class WorkerModule {}
