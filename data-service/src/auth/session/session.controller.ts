import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccessTokenService } from '../access-token.service';
import { clearSessionCookies, cookieName, setSessionCookies } from '../cookies';
import { SessionService } from './session.service';

/*
 * Every handler answers with a status and no body, so each writes the
 * response itself rather than going through the exception filter.
 */
@Controller('auth')
export class SessionController {
  constructor(
    private readonly accessTokens: AccessTokenService,
    private readonly sessions: SessionService,
  ) {}

  /**
   * The `edge` subrequest target (FR-AUTH-11, §7.3). Verifies the access JWT
   * and nothing else: no database read, no write.
   */
  @Get('resolve')
  resolve(@Req() req: Request, @Res() res: Response): void {
    const userId = this.accessTokens.verify(req.cookies[cookieName('access')]);
    if (!userId) {
      res.status(401).end();
      return;
    }
    res.status(204).setHeader('X-User-Id', userId).end();
  }

  /** FR-AUTH-18. */
  @Post('refresh')
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    const issued = await this.sessions.rotate(
      req.cookies[cookieName('refresh')],
    );
    if (!issued) {
      clearSessionCookies(res);
      res.status(401).end();
      return;
    }
    setSessionCookies(
      res,
      this.accessTokens.sign(issued.userId),
      issued.refreshToken,
    );
    res.status(204).end();
  }

  /** FR-AUTH-14: `204` whether or not a session was found. */
  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.sessions.revoke(req.cookies[cookieName('refresh')]);
    clearSessionCookies(res);
    res.status(204).end();
  }

  /** FR-AUTH-14. */
  @Post('logout-all')
  async logoutAll(@Req() req: Request, @Res() res: Response): Promise<void> {
    const userId = this.accessTokens.verify(req.cookies[cookieName('access')]);
    if (!userId) {
      // Q20 undecided: 401 and the cookies are left as they are.
      res.status(401).end();
      return;
    }
    await this.sessions.revokeAll(userId);
    clearSessionCookies(res);
    res.status(204).end();
  }
}
