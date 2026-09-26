import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuthAccountService } from '../../auth/auth-account.service';
import { Portfolio } from '../../schemas/portfolio.schema';
import { AdminPortfolioDto } from './dto/admin-portfolio.dto';
import { AdminSeoDto } from './dto/admin-seo.dto';
import { AdminThemeDto } from './dto/admin-theme.dto';
import { MeDto } from './dto/me.dto';
import { UpdateSlugDto } from './dto/update-slug.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
    private readonly accounts: AuthAccountService,
  ) {}

  /* Answers with or without a portfolio, so it takes the user id rather than
     the scope's portfolio id (§7.2). */
  async getMe(userId: string): Promise<MeDto> {
    const [user, portfolio] = await Promise.all([
      this.accounts.getDisplayFields(userId),
      this.portfolios
        .findOne({ userId: new Types.ObjectId(userId) })
        .select('slug status')
        .lean(),
    ]);
    if (!user) throw new NotFoundException('user_not_found');

    /* Allowlisted: `providerId` and `status` stay internal. */
    return {
      provider: user.provider,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      portfolio: portfolio
        ? { slug: portfolio.slug, status: portfolio.status }
        : null,
    };
  }

  async getDraft(portfolioId: string | null): Promise<AdminPortfolioDto> {
    if (portfolioId === null)
      throw new NotFoundException('portfolio_not_found');

    /* `published` is excluded: admin reads and writes `draft` only (§2.4). */
    const portfolio = await this.portfolios
      .findById(new Types.ObjectId(portfolioId))
      .select('-published')
      .lean();
    if (!portfolio) throw new NotFoundException('portfolio_not_found');

    const draft = portfolio.draft;
    return {
      slug: portfolio.slug,
      status: portfolio.status,
      registryVersion: portfolio.registryVersion,
      presetId: portfolio.presetId,
      draft: {
        sections: [...(draft?.sections ?? [])]
          .sort((a, b) => a.order - b.order)
          .map((section) => ({
            type: section.type,
            enabled: section.enabled,
            order: section.order,
            content: section.content ?? {},
          })),
        theme: (draft?.theme ?? {}) as AdminThemeDto,
        seo: (draft?.seo ?? {}) as AdminSeoDto,
        analytics: draft?.analytics ?? null,
      },
      publishedAt: portfolio.publishedAt,
      version: portfolio.version,
      draftRevision: portfolio.draftRevision ?? 0,
    };
  }

  updateTheme(
    portfolioId: string,
    theme: AdminThemeDto,
  ): Promise<AdminPortfolioDto> {
    throw new NotImplementedException();
  }

  updateSeo(portfolioId: string, seo: AdminSeoDto): Promise<AdminPortfolioDto> {
    throw new NotImplementedException();
  }

  updateSlug(
    portfolioId: string,
    dto: UpdateSlugDto,
  ): Promise<AdminPortfolioDto> {
    throw new NotImplementedException();
  }
}
