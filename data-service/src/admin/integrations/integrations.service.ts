import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IntegrationCache } from '../../schemas/integration-cache.schema';
import {
  IntegrationConnection,
  type IntegrationProvider,
} from '../../schemas/integration-connection.schema';
import { Portfolio } from '../../schemas/portfolio.schema';
import { AdminSectionDto } from '../sections/dto/admin-section.dto';
import { ConnectIntegrationDto } from './dto/connect-integration.dto';
import { CredlyBadgeDto } from './dto/credly-badge.dto';
import { CredlyImportDto } from './dto/credly-import.dto';
import { IntegrationDto } from './dto/integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectModel(IntegrationConnection.name)
    private readonly connections: Model<IntegrationConnection>,
    @InjectModel(IntegrationCache.name)
    private readonly cache: Model<IntegrationCache>,
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
  ) {}

  list(portfolioId: string): Promise<IntegrationDto[]> {
    throw new NotImplementedException();
  }

  connect(
    portfolioId: string,
    provider: IntegrationProvider,
    dto: ConnectIntegrationDto,
  ): Promise<IntegrationDto> {
    throw new NotImplementedException();
  }

  requestSync(
    portfolioId: string,
    provider: IntegrationProvider,
  ): Promise<void> {
    throw new NotImplementedException();
  }

  disconnect(
    portfolioId: string,
    provider: IntegrationProvider,
  ): Promise<void> {
    throw new NotImplementedException();
  }

  /** Appends imported badges to the draft achievements, unpublished (§5.2). */
  importCredly(
    portfolioId: string,
    dto: CredlyImportDto,
  ): Promise<AdminSectionDto> {
    throw new NotImplementedException();
  }

  addCredlyBadge(
    portfolioId: string,
    dto: CredlyBadgeDto,
  ): Promise<AdminSectionDto> {
    throw new NotImplementedException();
  }
}
