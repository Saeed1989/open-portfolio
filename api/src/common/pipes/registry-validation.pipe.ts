import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { getDescriptor } from '@openportfolio/registry';
import type {
  FieldDescriptor,
  FieldError,
  SectionType,
} from '@openportfolio/registry';

// ---------------------------------------------------------------------------
// Video provider allowlist
// ---------------------------------------------------------------------------

const VIDEO_PROVIDER_ALLOWLIST = [
  'youtube.com',
  'youtu.be',
  'vimeo.com',
  'loom.com',
] as const;

function isAllowedVideoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return VIDEO_PROVIDER_ALLOWLIST.some(
      (host) =>
        parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Per-field validation — appends to the shared errors array, never throws.
// Uses `path` (dotted) as required by FieldError.
// ---------------------------------------------------------------------------

function validateField(
  path: string,
  value: unknown,
  descriptor: FieldDescriptor,
  errors: FieldError[],
): void {
  const label = descriptor.label ?? path;

  // --- Required check -------------------------------------------------------
  if (descriptor.required) {
    const absent =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0);

    if (absent) {
      errors.push({ path, message: `${label} is required` });
      // Skip further checks — there is nothing to validate.
      return;
    }
  }

  // Nothing more to check on an absent optional field.
  if (value === undefined || value === null) return;

  // --- Kind-specific checks -------------------------------------------------
  switch (descriptor.kind) {
    case 'number': {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        errors.push({ path, message: `${label} must be a number` });
        break;
      }
      // Skill rating: integer 1–10
      if (path === 'rating' || path.endsWith('.rating')) {
        if (!Number.isInteger(num) || num < 1 || num > 10) {
          errors.push({
            path,
            message: `${label} must be an integer between 1 and 10`,
          });
        }
      }
      break;
    }

    case 'enum': {
      if (descriptor.options && !descriptor.options.includes(String(value))) {
        errors.push({
          path,
          message: `${label} must be one of: ${descriptor.options.join(', ')}`,
        });
      }
      break;
    }

    case 'multiselect': {
      if (Array.isArray(value) && descriptor.options) {
        const invalid = (value as unknown[])
          .map(String)
          .filter((v) => !descriptor.options!.includes(v));
        if (invalid.length > 0) {
          errors.push({
            path,
            message: `${label} contains invalid options: ${invalid.join(', ')}`,
          });
        }
      }
      break;
    }

    case 'url': {
      try {
        new URL(String(value));
      } catch {
        errors.push({ path, message: `${label} must be a valid URL` });
      }
      break;
    }

    case 'email': {
      // Simple structural check — not a full RFC 5321 parser.
      const emailStr = String(value);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        errors.push({ path, message: `${label} must be a valid email address` });
      }
      break;
    }

    // 'text', 'longtext', 'date', 'boolean', 'image', 'tags', 'list', 'link':
    // no extra structural check beyond required/max below.
  }

  // --- Max length -----------------------------------------------------------
  if (descriptor.max !== undefined) {
    if (typeof value === 'string' && value.length > descriptor.max) {
      errors.push({
        path,
        message: `${label} must be at most ${descriptor.max} characters`,
      });
    }
    // For list/tags/multiselect the max is a count cap.
    if (
      Array.isArray(value) &&
      (descriptor.kind === 'tags' ||
        descriptor.kind === 'list' ||
        descriptor.kind === 'multiselect') &&
      value.length > descriptor.max
    ) {
      errors.push({
        path,
        message: `${label} must have at most ${descriptor.max} items`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Public validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate a section-level content object against its registry descriptor.
 *
 * Collects ALL field errors before returning — never stops at the first
 * failure (FR-API-4, FR-PUB-6).
 *
 * @param type    The section type string (e.g. `'skills'`, `'projects'`).
 * @param payload The raw content object received from the request.
 * @returns       A (possibly empty) array of `FieldError`.
 */
export function validateSectionPayload(
  type: string,
  payload: Record<string, unknown>,
): FieldError[] {
  const errors: FieldError[] = [];

  const descriptor = getDescriptor(type as SectionType);
  if (!descriptor) {
    return [{ path: 'type', message: `Unknown section type: ${type}` }];
  }

  const fields =
    descriptor.cardinality === 'single'
      ? descriptor.fields
      : (descriptor.sectionFields ?? []);

  for (const fieldDesc of fields) {
    validateField(fieldDesc.key, payload[fieldDesc.key], fieldDesc, errors);
  }

  return errors;
}

/**
 * Validate a collection item payload against the `itemFields` descriptor.
 *
 * Also enforces the gallery video URL provider allowlist.
 *
 * @param type    The collection section type (e.g. `'gallery'`, `'projects'`).
 * @param payload The raw item object received from the request.
 * @returns       A (possibly empty) array of `FieldError`.
 */
export function validateItemPayload(
  type: string,
  payload: Record<string, unknown>,
): FieldError[] {
  const errors: FieldError[] = [];

  const descriptor = getDescriptor(type as SectionType);
  if (!descriptor) {
    return [{ path: 'type', message: `Unknown section type: ${type}` }];
  }

  if (descriptor.cardinality !== 'collection') {
    return [
      { path: 'type', message: `Section type '${type}' is not a collection` },
    ];
  }

  for (const fieldDesc of descriptor.itemFields) {
    const value = payload[fieldDesc.key];
    validateField(fieldDesc.key, value, fieldDesc, errors);

    // Gallery-specific: video URL must come from an allowed provider.
    if (
      type === 'gallery' &&
      fieldDesc.key === 'videoUrl' &&
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      if (!isAllowedVideoUrl(String(value))) {
        errors.push({
          path: fieldDesc.key,
          message: `Video URL must be from an allowed provider: ${VIDEO_PROVIDER_ALLOWLIST.join(', ')}`,
        });
      }
    }
  }

  return errors;
}

/**
 * Throw HTTP 422 with the full `FieldError[]` payload when there are errors.
 *
 * Callers (controllers, publish service) collect errors across all sections
 * and call this once at the end so every failure is reported together.
 */
export function throwIfErrors(errors: FieldError[]): void {
  if (errors.length > 0) {
    throw new HttpException({ errors }, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

// ---------------------------------------------------------------------------
// NestJS pipe wrapper
// ---------------------------------------------------------------------------

/**
 * `RegistryValidationPipe` is a lightweight NestJS pipe that validates a
 * section content payload against its registry descriptor.
 *
 * Usage at the controller method level:
 *
 * ```typescript
 * @Patch('sections/:type')
 * updateSection(
 *   @Param('type') type: string,
 *   @Body(new RegistryValidationPipe()) body: Record<string, unknown>,
 * ) { ... }
 * ```
 *
 * The pipe receives the `type` at construction time via `forType()`:
 *
 * ```typescript
 * new RegistryValidationPipe().forType('skills')
 * ```
 *
 * Or use `validateSectionPayload` / `validateItemPayload` directly in the
 * service layer when batching errors across multiple sections (publish flow).
 */
@Injectable()
export class RegistryValidationPipe {
  private sectionType: string | undefined;
  private isItem = false;

  /** Pin the pipe to a specific section type. */
  forType(type: string, isItem = false): this {
    this.sectionType = type;
    this.isItem = isItem;
    return this;
  }

  transform(value: unknown): unknown {
    if (!this.sectionType) {
      // No type bound — pass through (caller uses the standalone helpers).
      return value;
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new HttpException(
        { errors: [{ path: 'body', message: 'Request body must be an object' }] },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const payload = value as Record<string, unknown>;
    const errors = this.isItem
      ? validateItemPayload(this.sectionType, payload)
      : validateSectionPayload(this.sectionType, payload);

    throwIfErrors(errors);
    return value;
  }
}
