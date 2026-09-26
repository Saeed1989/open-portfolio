import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- `export =` with no esModuleInterop
import cookieParser = require('cookie-parser');
import { Session, SessionSchema } from '../schemas/session.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { AccessTokenService } from './access-token.service';
import { AuthAccountService } from './auth-account.service';
import { authConfigProvider } from './auth.config';
import { OAuthController } from './oauth/oauth.controller';
import { OAuthService } from './oauth/oauth.service';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';
import { TokenCipher } from './token-cipher';

/**
 * The auth surface (§2.1): sole owner of `users` and `sessions`
 * (FR-AUTH-13), reached by other modules only through `AuthAccountService`
 * (FR-AUTH-17).
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [OAuthController, SessionController],
  providers: [
    authConfigProvider,
    TokenCipher,
    AccessTokenService,
    SessionService,
    OAuthService,
    AuthAccountService,
  ],
  exports: [AuthAccountService],
})
export class AuthModule implements NestModule {
  /* Cookies are parsed on the auth routes only; the admin surface parses
     none (§2.6 step 7). */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(cookieParser())
      .forRoutes(OAuthController, SessionController);
  }
}
