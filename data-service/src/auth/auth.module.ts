import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessTokenService } from './access-token.service';
import { ACCOUNT_ACCESS } from './account-access';
import { AccountService } from './account.service';
import { AUTH_CONFIG, loadAuthConfig } from './auth.config';
import { AuthController } from './auth.controller';
import { GoogleOidcService } from './google-oidc.service';
import { Session, SessionSchema } from './schemas/session.schema';
import { User, UserSchema } from './schemas/user.schema';
import { SessionService } from './session.service';

/**
 * The auth surface (SRS §2.1): sole owner of `users` and `sessions`, sole
 * holder of the OAuth client secret and the JWT keys. It exports the
 * interface of FR-AUTH-17 and nothing else.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        loadAuthConfig((name) => config.get<string>(name)),
    },
    AccessTokenService,
    SessionService,
    GoogleOidcService,
    AccountService,
    { provide: ACCOUNT_ACCESS, useExisting: AccountService },
  ],
  exports: [ACCOUNT_ACCESS],
})
export class AuthModule {}
