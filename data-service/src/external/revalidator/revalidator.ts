/**
 * Asks the `portfolio` app to drop its cached page for a slug. Callers depend
 * on this interface only; switching implementations is a change to
 * `REVALIDATE_MODE`.
 */
export interface Revalidator {
  revalidate(slug: string): Promise<void>;
}

export const REVALIDATOR = Symbol('Revalidator');
