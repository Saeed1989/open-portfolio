import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { FieldError } from '@portfolio/registry';

/*
 * Typed so a shared error envelope can be built from `code` and `errors` later;
 * until then AllExceptionsFilter serialises these bodies as they are.
 */

/**
 * A draft write whose `If-Match` was absent or no longer current. Carries the
 * revision a retry would have to match.
 */
export class StaleWriteException extends ConflictException {
  constructor(draftRevision: number, message: string) {
    super({ code: 'stale_write', message, draftRevision });
  }
}

/** Every failure at once, per field. */
export class SectionValidationException extends UnprocessableEntityException {
  constructor(errors: readonly FieldError[]) {
    super({
      code: 'validation_failed',
      message: 'The section was not saved.',
      errors,
    });
  }
}
