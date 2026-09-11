import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio } from '../../schemas/portfolio.schema';
import { User } from '../../schemas/user.schema';
import { AdminPortfolioDto } from './dto/admin-portfolio.dto';
import { AdminSeoDto } from './dto/admin-seo.dto';
import { AdminThemeDto } from './dto/admin-theme.dto';
import { MeDto } from './dto/me.dto';
import { UpdateSlugDto } from './dto/update-slug.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Portfolio.name) private readonly portfolios: Model<Portfolio>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  getMe(userId: string): Promise<MeDto> {
    throw new NotImplementedException();
  }

  getDraft(portfolioId: string): Promise<AdminPortfolioDto> {
    throw new NotImplementedException();
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
