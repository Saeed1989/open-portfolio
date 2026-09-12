/**
 * Asks the `portfolio` app to drop its cached page for a slug (SRS §2.3 step 8,
 * FR-PUB-7).
 *
 * The real implementation POSTs `{ slug }` to `/internal/revalidate` on the
 * portfolio host with a shared secret (§7.3). Callers depend on this interface
 * only; switching implementations is a change to `REVALIDATE_MODE`.
 */
export interface Revalidator {
  revalidate(slug: string): Promise<void>;
}

export const REVALIDATOR = Symbol('Revalidator');
