import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Controller, Get, Logger, Post, Query, Req, Res } from '@nestjs/common';
import {
  ApiFoundResponse,
  ApiNoContentResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ACCESS_TTL_SECONDS, AccessTokenService } from './access-token.service';
import { AccountService } from './account.service';
import {
  ACCESS_COOKIE,
  clearCookie,
  readCookie,
  REFRESH_COOKIE,
  setCookie,
  STATE_COOKIE,
  STATE_MAX_AGE_SECONDS,
} from './cookies';
import { GoogleOidcService, type OidcAttempt } from './google-oidc.service';
import { resolveReturnTo } from './return-to';
import { type IssuedSession, SessionService } from './session.service';

/** The state cookie's content: one attempt and where to land after it. */
interface StoredAttempt extends OidcAttempt {
  readonly returnTo: string;
}

type FailureCode = 'auth_failed' | 'account_suspended';

const random = () => randomBytes(32).toString('base64url');

/**
 * The auth surface (SRS §7.3, §7.4). Paths are without `/api`, which `edge`
 * strips. Every handler writes its own response: redirects, cookies, and
 * `401`s with no body are not what the global filter produces.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly google: GoogleOidcService,
    private readonly accounts: AccountService,
    private readonly sessions: SessionService,
    private readonly tokens: AccessTokenService,
  ) {}

  @Get('google/start')
  @ApiOperation({ summary: 'Begin Google sign-in (FR-AUTH-8)' })
  @ApiQuery({
    name: 'returnTo',
    required: false,
    description: 'Honoured only when it is on the allowlist (FR-AUTH-15).',
  })
  @ApiFoundResponse({ description: "To Google's authorization endpoint." })
  start(
    @Query('returnTo') returnTo: unknown,
    @Res() response: ServerResponse,
  ): void {
    const attempt: StoredAttempt = {
      state: random(),
      verifier: random(),
      nonce: random(),
      returnTo: resolveReturnTo(returnTo),
    };
    setCookie(
      response,
      STATE_COOKIE,
      Buffer.from(JSON.stringify(attempt)).toString('base64url'),
      STATE_MAX_AGE_SECONDS,
    );
    redirect(response, this.google.authorizationUrl(attempt));
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Complete Google sign-in (§2.5)' })
  @ApiFoundResponse({
    description:
      'To the admin panel with both cookies set, or to `/sign-in?error=auth_failed|account_suspended`.',
  })
  async callback(
    @Query('code') code: unknown,
    @Query('state') state: unknown,
    @Req() request: IncomingMessage,
    @Res() response: ServerResponse,
  ): Promise<void> {
    let outcome: { session: IssuedSession; returnTo: string } | FailureCode;
    try {
      outcome = await this.completeSignIn(request, code, state);
    } catch (error) {
      this.logger.error(
        `sign-in failed: ${error instanceof Error ? error.name : 'unknown error'}`,
      );
      outcome = 'auth_failed';
    }

    /* Cleared on completion or failure (FR-AUTH-8). */
    clearCookie(response, STATE_COOKIE);
    if (typeof outcome === 'string') {
      redirect(response, `/sign-in?error=${outcome}`);
      return;
    }
    await this.setSessionCookies(response, outcome.session);
    redirect(response, outcome.returnTo);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Rotate the refresh token, issue a new access JWT (FR-AUTH-18)',
  })
  @ApiNoContentResponse({ description: 'Both cookies re-set.' })
  @ApiUnauthorizedResponse({
    description: 'Any failure, reuse included. Both cookies cleared.',
  })
  async refresh(
    @Req() request: IncomingMessage,
    @Res() response: ServerResponse,
  ): Promise<void> {
    const presented = readCookie(request, REFRESH_COOKIE);
    const session = presented ? await this.sessions.rotate(presented) : null;
    if (!session) {
      clearSessionCookies(response);
      end(response, 401);
      return;
    }
    await this.setSessionCookies(response, session);
    end(response, 204);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the presented session (FR-AUTH-14)' })
  @ApiNoContentResponse({
    description: 'Whether or not a session was found. Both cookies cleared.',
  })
  async logout(
    @Req() request: IncomingMessage,
    @Res() response: ServerResponse,
  ): Promise<void> {
    const presented = readCookie(request, REFRESH_COOKIE);
    if (presented) await this.sessions.revoke(presented);
    clearSessionCookies(response);
    end(response, 204);
  }

  @Post('logout-all')
  @ApiOperation({
    summary: 'Revoke every session of the access JWT’s user (FR-AUTH-14)',
  })
  @ApiNoContentResponse({ description: 'Both cookies cleared.' })
  @ApiUnauthorizedResponse({ description: 'Access JWT absent or invalid.' })
  async logoutAll(
    @Req() request: IncomingMessage,
    @Res() response: ServerResponse,
  ): Promise<void> {
    const userId = await this.tokens.verify(readCookie(request, ACCESS_COOKIE));
    if (!userId) {
      /* Cookies are left alone: the admin app refreshes and retries
         (FR-AUTH-20), which needs the refresh cookie. */
      end(response, 401);
      return;
    }
    await this.sessions.revokeAllForUser(userId);
    clearSessionCookies(response);
    end(response, 204);
  }

  @Get('resolve')
  @ApiOperation({
    summary: 'Identity subrequest target, called by edge (FR-AUTH-11)',
  })
  @ApiNoContentResponse({ description: '`X-User-Id` carries the user id.' })
  @ApiUnauthorizedResponse({ description: 'No body.' })
  async resolve(
    @Req() request: IncomingMessage,
    @Res() response: ServerResponse,
  ): Promise<void> {
    /* Verifies the access JWT and nothing else: no collection is read. */
    const userId = await this.tokens.verify(readCookie(request, ACCESS_COOKIE));
    if (!userId) {
      end(response, 401);
      return;
    }
    response.setHeader('X-User-Id', userId);
    end(response, 204);
  }

  /* §2.5 steps 4–6. `state` is verified before the code is exchanged. */
  private async completeSignIn(
    request: IncomingMessage,
    code: unknown,
    state: unknown,
  ): Promise<{ session: IssuedSession; returnTo: string } | FailureCode> {
    const attempt = readAttempt(request);
    if (
      !attempt ||
      typeof state !== 'string' ||
      !sameString(state, attempt.state) ||
      typeof code !== 'string' ||
      code === ''
    ) {
      return 'auth_failed';
    }

    const identity = await this.google.exchange(code, attempt);
    if (!identity) return 'auth_failed';

    const signIn = await this.accounts.signInWithGoogle(identity);
    if ('refused' in signIn) return signIn.refused;

    return {
      session: await this.sessions.create(signIn.userId),
      /* Re-checked on the way out, so the cookie is not trusted for it. */
      returnTo: resolveReturnTo(attempt.returnTo),
    };
  }

  /* FR-AUTH-3. The refresh cookie lives as long as the session can: until
     `idleExpiresAt`, which is already the earlier of the two windows. */
  private async setSessionCookies(
    response: ServerResponse,
    session: IssuedSession,
  ): Promise<void> {
    setCookie(
      response,
      ACCESS_COOKIE,
      await this.tokens.sign(session.userId),
      ACCESS_TTL_SECONDS,
    );
    setCookie(
      response,
      REFRESH_COOKIE,
      session.refreshToken,
      Math.max(
        0,
        Math.floor((session.idleExpiresAt.getTime() - Date.now()) / 1000),
      ),
    );
  }
}

function readAttempt(request: IncomingMessage): StoredAttempt | null {
  const raw = readCookie(request, STATE_COOKIE);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    );
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { state, verifier, nonce, returnTo } = parsed as Record<
      string,
      unknown
    >;
    if (
      typeof state !== 'string' ||
      typeof verifier !== 'string' ||
      typeof nonce !== 'string' ||
      typeof returnTo !== 'string'
    ) {
      return null;
    }
    return { state, verifier, nonce, returnTo };
  } catch {
    return null;
  }
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function clearSessionCookies(response: ServerResponse): void {
  clearCookie(response, ACCESS_COOKIE);
  clearCookie(response, REFRESH_COOKIE);
}

function redirect(response: ServerResponse, location: string): void {
  response.setHeader('Location', location);
  end(response, 302);
}

function end(response: ServerResponse, status: number): void {
  response.statusCode = status;
  response.end();
}
