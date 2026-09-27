import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

  async list(portfolioId: string | null): Promise<IntegrationDto[]> {
    if (portfolioId === null)
      throw new NotFoundException('portfolio_not_found');
    const scope = { portfolioId: new Types.ObjectId(portfolioId) };

    /* Staleness is read from the cache, not from the portfolio: the published
       tree carries none (FR-INT-3). */
    const [connections, cached] = await Promise.all([
      this.connections.find(scope).lean(),
      this.cache.find(scope).lean(),
    ]);
    const byProvider = new Map(cached.map((row) => [row.provider, row]));

    return connections.map((connection) => {
      const entry = byProvider.get(connection.provider);
      return {
        provider: connection.provider,
        config: connection.config ?? {},
        status: connection.status,
        lastSyncAt: connection.lastSyncAt ?? null,
        lastError: connection.lastError ?? null,
        consecutiveFailures: connection.consecutiveFailures ?? 0,
        /* `credentials` is named nowhere above, by allowlist (FR-INT-6). */
        cache: entry
          ? {
              payload: entry.payload ?? {},
              fetchedAt: entry.fetchedAt,
              stale: entry.stale ?? false,
            }
          : null,
      };
    });
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
