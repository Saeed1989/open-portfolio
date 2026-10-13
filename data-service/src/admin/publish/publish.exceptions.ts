import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { FieldError } from '@portfolio/registry';

/**
 * Every failure at once, per field (FR-PUB-6). Each `path` is the section
 * type, then the path within its content: `projects.items[0].impact`.
 */
export class PublishValidationException extends UnprocessableEntityException {
  constructor(errors: readonly FieldError[]) {
    super({
      code: 'validation_failed',
      message: 'The draft cannot be published until these are fixed.',
      errors,
    });
  }
}

/** FR-CFG-4: no enabled section has content. */
export class NothingToPublishException extends UnprocessableEntityException {
  constructor() {
    super({
      code: 'nothing_to_publish',
      message: 'Publishing requires at least one enabled section with content.',
      errors: [],
    });
  }
}

export class PortfolioSuspendedException extends ConflictException {
  constructor() {
    super({
      code: 'portfolio_suspended',
      message: 'A suspended portfolio cannot be published.',
    });
  }
}
