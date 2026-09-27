import { BadRequestException } from '@nestjs/common';

/*
 * The admin surface's concurrency token is `portfolios.draftRevision`, served
 * as a strong ETag and echoed back in `If-Match` on every draft write. Not in
 * the SRS; see the note on `Portfolio.draftRevision`.
 */

export function etag(draftRevision: number): string {
  return `"${draftRevision}"`;
}

/*
 * One revision, quoted as issued or bare — admin's precondition.ts sends it
 * bare. Weak tags, `*`, and lists are refused: `*` would match any revision
 * and a weak tag cannot be compared strongly, so neither is a precondition.
 */
const IF_MATCH = /^(?:"(\d{1,15})"|(\d{1,15}))$/;

/** Undefined when the header is absent; the caller decides what that means. */
export function parseIfMatch(header: string | undefined): number | undefined {
  if (header === undefined) return undefined;
  const match = IF_MATCH.exec(header.trim());
  if (!match) {
    throw new BadRequestException({
      code: 'invalid_if_match',
      message: 'If-Match must be the ETag this surface issued, e.g. "3".',
    });
  }
  return Number(match[1] ?? match[2]);
}
