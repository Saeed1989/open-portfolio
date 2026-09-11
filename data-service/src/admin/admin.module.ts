import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { revalidatorProvider } from '../external/revalidator/revalidator.provider';
import { storageSignerProvider } from '../external/storage-signer/storage-signer.provider';
import {
  IntegrationCache,
  IntegrationCacheSchema,
} from '../schemas/integration-cache.schema';
import {
  IntegrationConnection,
  IntegrationConnectionSchema,
} from '../schemas/integration-connection.schema';
import { LinkHealth, LinkHealthSchema } from '../schemas/link-health.schema';
import { Media, MediaSchema } from '../schemas/media.schema';
import { Portfolio, PortfolioSchema } from '../schemas/portfolio.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { IntegrationsController } from './integrations/integrations.controller';
import { IntegrationsService } from './integrations/integrations.service';
import { LinkHealthController } from './link-health/link-health.controller';
import { LinkHealthService } from './link-health/link-health.service';
import { MediaController } from './media/media.controller';
import { MediaService } from './media/media.service';
import { PortfolioController } from './portfolio/portfolio.controller';
import { PortfolioService } from './portfolio/portfolio.service';
import { PublishController } from './publish/publish.controller';
import { PublishService } from './publish/publish.service';
import { SectionsController } from './sections/sections.controller';
import { SectionsService } from './sections/sections.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Portfolio.name, schema: PortfolioSchema },
      { name: User.name, schema: UserSchema },
      { name: Media.name, schema: MediaSchema },
      { name: IntegrationConnection.name, schema: IntegrationConnectionSchema },
      { name: IntegrationCache.name, schema: IntegrationCacheSchema },
      { name: LinkHealth.name, schema: LinkHealthSchema },
    ]),
  ],
  controllers: [
    PortfolioController,
    SectionsController,
    MediaController,
    IntegrationsController,
    PublishController,
    LinkHealthController,
  ],
  providers: [
    PortfolioService,
    SectionsService,
    MediaService,
    IntegrationsService,
    PublishService,
    LinkHealthService,
    revalidatorProvider,
    storageSignerProvider,
  ],
})
export class AdminModule {}
