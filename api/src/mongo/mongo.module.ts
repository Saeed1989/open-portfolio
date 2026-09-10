import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  User, UserSchema,
  Portfolio, PortfolioSchema,
  Media, MediaSchema,
  IntegrationConnection, IntegrationConnectionSchema,
  IntegrationCache, IntegrationCacheSchema,
  LinkHealth, LinkHealthSchema,
  AuditLog, AuditLogSchema,
} from './schemas';

export const MONGO_MODELS = [
  { name: User.name, schema: UserSchema },
  { name: Portfolio.name, schema: PortfolioSchema },
  { name: Media.name, schema: MediaSchema },
  { name: IntegrationConnection.name, schema: IntegrationConnectionSchema },
  { name: IntegrationCache.name, schema: IntegrationCacheSchema },
  { name: LinkHealth.name, schema: LinkHealthSchema },
  { name: AuditLog.name, schema: AuditLogSchema },
];

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature(MONGO_MODELS),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
