import { Revalidator } from './revalidator';

/** REVALIDATE_MODE=noop — local development, where there is no cache to drop. */
export class NoopRevalidator implements Revalidator {
  async revalidate(slug: string): Promise<void> {}
}
