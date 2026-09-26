import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthFlowError } from '../auth-flow.error';
import {
  clearCookie,
  cookieName,
  setCookie,
  setSessionCookies,
} from '../cookies';
import { OAuthService } from './oauth.service';
import { AUTH_PROVIDERS, type AuthProvider } from './providers';

/** Sign-in (§2.5; FR-AUTH-1, 8, 9, 15). No Passport. */
@Controller('auth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(private readonly oauth: OAuthService) {}

  @Get(':provider/start')
  start(
    @Param('provider') provider: string,
    @Query('returnTo') returnTo: unknown,
    @Res() res: Response,
  ): void {
    const { stateCookie, redirectTo } = this.oauth.start(
      knownProvider(provider),
      returnTo,
    );
    setCookie(res, 'state', stateCookie);
    res.redirect(302, redirectTo);
  }

  @Get(':provider/callback')
  async callback(
    @Param('provider') provider: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const known = knownProvider(provider);

    /* Cleared on success and on every failure (FR-AUTH-8). */
    clearCookie(res, 'state');
    try {
      const signedIn = await this.oauth.callback(
        known,
        req.cookies[cookieName('state')],
        query,
      );
      setSessionCookies(res, signedIn.accessToken, signedIn.refreshToken);
      res.redirect(302, signedIn.redirectTo);
    } catch (error) {
      if (!(error instanceof AuthFlowError)) {
        this.logger.error(error);
      }
      const code = error instanceof AuthFlowError ? error.code : 'server_error';
      res.redirect(302, this.oauth.failureUrl(code));
    }
  }
}

function knownProvider(provider: string): AuthProvider {
  if (!(AUTH_PROVIDERS as readonly string[]).includes(provider)) {
    throw new NotFoundException();
  }
  return provider as AuthProvider;
}
