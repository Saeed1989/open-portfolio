import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';

/* Portfolio creation failures (§7.2), in the same `code` + field-level
   `errors` shape as sections.exceptions.ts. */

/** `slug_invalid` or `slug_reserved`: 422 with a field-level error. */
export class SlugRejectedException extends UnprocessableEntityException {
  constructor(problem: 'invalid' | 'reserved') {
    const message =
      problem === 'invalid'
        ? '3–63 lowercase letters, digits and single hyphens, not starting or ending with a hyphen.'
        : 'This slug is reserved.';
    super({
      code: `slug_${problem}`,
      message,
      errors: [{ path: 'slug', message }],
    });
  }
}

export class SlugTakenException extends ConflictException {
  constructor() {
    const message = 'This slug is taken.';
    super({
      code: 'slug_taken',
      message,
      errors: [{ path: 'slug', message }],
    });
  }
}

export class PortfolioExistsException extends ConflictException {
  constructor() {
    super({
      code: 'portfolio_exists',
      message: 'This account already has a portfolio.',
    });
  }
}
