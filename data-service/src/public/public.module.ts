import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Portfolio, PortfolioSchema } from '../schemas/portfolio.schema';
import { PortfoliosController } from './portfolios/portfolios.controller';
import { PortfoliosService } from './portfolios/portfolios.service';
import { SitemapController } from './sitemap/sitemap.controller';
import { SitemapService } from './sitemap/sitemap.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Portfolio.name, schema: PortfolioSchema },
    ]),
  ],
  controllers: [PortfoliosController, SitemapController],
  providers: [PortfoliosService, SitemapService],
})
export class PublicModule {}
