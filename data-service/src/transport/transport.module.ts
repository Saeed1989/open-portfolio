import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GATEWAY_KEYS, loadGatewayKeys } from './gateway-key.config';
import { GatewayKeyMiddleware } from './gateway-key.middleware';

/**
 * What stands between the network and the surfaces (FR-EDGE-5). It belongs to
 * none of them: the auth and admin trees are both behind the key, and neither
 * knows it exists. `/public/*` is not covered.
 */
@Module({
  providers: [
    {
      provide: GATEWAY_KEYS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        loadGatewayKeys((name) => config.get<string>(name)),
    },
  ],
})
export class TransportModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(GatewayKeyMiddleware).forRoutes('auth', 'admin');
  }
}
