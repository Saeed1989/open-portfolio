import { Logger } from '@nestjs/common';
import { Revalidator } from './revalidator';

const TIMEOUT_MS = 5000;

/**
 * REVALIDATE_MODE=http — POSTs `{ slug }` to the portfolio app's revalidation
 * endpoint with the shared secret (§2.3 step 8, §7.3, NFR-SEC-3).
 *
 * A failure is logged and not thrown. By the time this runs the published
 * tree is already written, so the publish has happened; a portfolio app that
 * is down or slow leaves the cached page to expire by its own lifetime, and
 * must not turn a stored publish into an error.
 */
export class HttpRevalidator implements Revalidator {
  private readonly logger = new Logger(HttpRevalidator.name);

  constructor(
    private readonly url: string,
    private readonly secret: string,
  ) {}

  async revalidate(slug: string): Promise<void> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn(
          `Revalidating ${slug} answered ${response.status}; the cached page stays until it expires.`,
        );
      }
    } catch (cause) {
      this.logger.warn(
        `Revalidating ${slug} failed (${cause instanceof Error ? cause.message : String(cause)}); the cached page stays until it expires.`,
      );
    }
  }
}
