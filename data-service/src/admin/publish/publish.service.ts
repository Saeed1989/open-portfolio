import {
  Inject,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { isSectionEmpty } from '@portfolio/registry';
import { buildPublishedTree } from '../../common/published-tree';
import {
  REVALIDATOR,
  Revalidator,
} from '../../external/revalidator/revalidator';
import { IntegrationCache } from '../../schemas/integration-cache.schema';
import { Portfolio } from '../../schemas/portfolio.schema';
import { PublishResultDto } from './dto/publish-result.dto';
import { validateSectionForPublish } from './publish-validation';
import {
  NothingToPublishException,
  PortfolioSuspendedException,
  PublishValidationException,
} from './publish.exceptions';

@Injectable()
export class PublishService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
    @InjectModel(IntegrationCache.name)
    private readonly cache: Model<IntegrationCache>,
    @Inject(REVALIDATOR) private readonly revalidator: Revalidator,
  ) {}

  /**
   * SRS §2.3 steps 2–8, without step 4: no sync writes a payload yet, so
   * there is none to merge.
   */
  async publish(portfolioId: string | null): Promise<PublishResultDto> {
    if (portfolioId === null)
      throw new NotFoundException('portfolio_not_found');

    const _id = new Types.ObjectId(portfolioId);
    const portfolio = await this.portfolios
      .findById(_id)
      .select('slug status draft draftRevision')
      .lean();
    if (!portfolio) throw new NotFoundException('portfolio_not_found');
    if (portfolio.status === 'suspended')
      throw new PortfolioSuspendedException();

    /* Only what a publish would carry is held to the publish rules: a
       disabled or empty section is left off the page, not refused. */
    const errors = portfolio.draft.sections
      .filter(
        (section) =>
          section.enabled && !isSectionEmpty(section.type, section.content),
      )
      .flatMap((section) =>
        validateSectionForPublish(section.type, section.content).map(
          (error) => ({ ...error, path: `${section.type}.${error.path}` }),
        ),
      );
    if (errors.length > 0) throw new PublishValidationException(errors);

    const published = buildPublishedTree(portfolio.draft);
    if (Object.keys(published.data).length === 0)
      throw new NothingToPublishException();

    const publishedAt = new Date();
    /* The revision read with the draft above, not the current one: a draft
       write landing meanwhile is not in this publish. */
    const publishedDraftRevision = portfolio.draftRevision ?? 0;
    const updated = await this.portfolios
      .findOneAndUpdate(
        { _id },
        {
          $set: {
            published,
            publishedAt,
            publishedDraftRevision,
            status: 'published',
          },
          $inc: { version: 1 },
        },
        { new: true },
      )
      .select('version')
      .lean();
    if (!updated) throw new NotFoundException('portfolio_not_found');

    await this.revalidator.revalidate(portfolio.slug);
    return { version: updated.version, publishedAt, publishedDraftRevision };
  }

  unpublish(portfolioId: string): Promise<void> {
    throw new NotImplementedException();
  }
}
