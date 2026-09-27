import { ApiProperty } from '@nestjs/swagger';
import {
  PORTFOLIO_STATUSES,
  type PortfolioStatus,
} from '../../../schemas/portfolio.schema';
import {
  AUTH_PROVIDERS,
  type AuthProvider,
} from '../../../schemas/user.schema';

/** What `admin` branches on to choose dashboard or creation screen. */
export class MePortfolioDto {
  @ApiProperty({ type: String, required: true, example: 'alice' })
  slug: string;

  @ApiProperty({
    enum: [...PORTFOLIO_STATUSES],
    required: true,
    example: 'published',
  })
  status: PortfolioStatus;
}

export class MeDto {
  @ApiProperty({ enum: [...AUTH_PROVIDERS], required: true, example: 'github' })
  provider: AuthProvider;

  @ApiProperty({ type: String, required: true, example: 'alice@example.com' })
  email: string;

  @ApiProperty({ type: String, required: true, example: 'Alice Doe' })
  displayName: string;

  @ApiProperty({
    type: String,
    required: false,
    example: 'https://avatars.githubusercontent.com/u/1',
  })
  avatarUrl?: string;

  @ApiProperty({
    type: MePortfolioDto,
    required: true,
    nullable: true,
    description: 'Null when the tenant has no portfolio yet (FR-AUTH-7).',
  })
  portfolio: MePortfolioDto | null;
}
