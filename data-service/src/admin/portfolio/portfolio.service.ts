import {
  Inject,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, mongo, Types } from 'mongoose';
import { createInitialDraft, REGISTRY_VERSION } from '@portfolio/registry';
import { ACCOUNT_ACCESS, type AccountAccess } from '../../auth/account-access';
import {
  REVALIDATOR,
  type Revalidator,
} from '../../external/revalidator/revalidator';
import { Portfolio } from '../../schemas/portfolio.schema';
import { AdminPortfolioDto } from './dto/admin-portfolio.dto';
import { AdminSeoDto } from './dto/admin-seo.dto';
import { AdminThemeDto } from './dto/admin-theme.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { MeDto } from './dto/me.dto';
import { SlugAvailabilityDto } from './dto/slug-availability.dto';
import { UpdateSlugDto } from './dto/update-slug.dto';
import {
  PortfolioExistsException,
  SlugRejectedException,
  SlugTakenException,
} from './portfolio.exceptions';
import { normaliseSlug, slugProblem } from './slug';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
    @Inject(ACCOUNT_ACCESS) private readonly accounts: AccountAccess,
    @Inject(REVALIDATOR) private readonly revalidator: Revalidator,
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

    /* Allowlisted: `providerId` and `status` never leave auth (FR-AUTH-17). */
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

  /* Taken by the same rules as `409 slug_taken`: a live slug, or one held in
     a portfolio's `slugHistory` (§7.2). */
  async slugAvailability(raw: string): Promise<SlugAvailabilityDto> {
    const slug = normaliseSlug(raw);
    const problem = slugProblem(slug);
    if (problem) return { slug, status: problem };

    const held = await this.portfolios.exists({
      $or: [{ slug }, { 'slugHistory.slug': slug }],
    });
    return { slug, status: held ? 'taken' : 'available' };
  }

  /**
   * Creates the tenant's one portfolio (§7.2, FR-AUTH-7). Uniqueness of the
   * owner and of the slug is decided by the unique indexes at the write, so
   * a concurrent claim fails there rather than slipping past a read.
   */
  async create(
    userId: string,
    portfolioId: string | null,
    dto: CreatePortfolioDto,
  ): Promise<AdminPortfolioDto> {
    /* Takes precedence over every slug error (§7.2). */
    if (portfolioId !== null) throw new PortfolioExistsException();

    const slug = normaliseSlug(dto.slug);
    const problem = slugProblem(slug);
    if (problem) throw new SlugRejectedException(problem);

    /* A retired slug stays held (FR-DAT-2). No index can say so: see I-5 in
       portfolio.schema.ts. */
    if (await this.portfolios.exists({ 'slugHistory.slug': slug })) {
      throw new SlugTakenException();
    }

    const presetId = dto.preset ?? 'software-engineer';
    let created: { _id: Types.ObjectId };
    try {
      created = await this.portfolios.create({
        userId: new Types.ObjectId(userId),
        slug,
        slugHistory: [],
        status: 'unpublished',
        registryVersion: REGISTRY_VERSION,
        presetId,
        draft: createInitialDraft(presetId, { name: dto.name }),
        published: null,
        publishedAt: null,
        version: 0,
      });
    } catch (error) {
      if (!(error instanceof mongo.MongoServerError && error.code === 11000)) {
        throw error;
      }
      /* Mongo names whichever unique index it hit first. A slug collision
         can still be this tenant's own concurrent claim, which §7.2 reports
         as portfolio_exists. */
      if (
        error.keyPattern?.userId ||
        (await this.portfolios.exists({ userId: new Types.ObjectId(userId) }))
      ) {
        throw new PortfolioExistsException();
      }
      throw new SlugTakenException();
    }

    /* Drops any cached 404 for the new tenant host. */
    await this.revalidator.revalidate(slug);
    return this.getDraft(created._id.toHexString());
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
