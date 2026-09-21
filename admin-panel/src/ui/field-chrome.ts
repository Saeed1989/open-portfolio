/*
 * One focus ring and one invalid treatment for the whole field system.
 *
 * Every one of the eleven field components draws its control through this
 * module. A component that composes its own border, ring or error colour is a
 * defect — that is the rule the module exists to make cheap to follow, and the
 * reason the classes below are strings here rather than copied into eleven
 * files.
 */

/** The five states every field renders identically (M0 item 3). */
export type FieldState =
  | 'default'
  | 'focus'
  | 'error'
  | 'disabled'
  | 'placeholder';

/**
 * Publish-readiness, orthogonal to `FieldState`.
 *
 * `pending` is the dotted grey marker: the field is required *for publish* and
 * empty, and the draft still saves (FR-REG-8 — `required` is enforced at
 * publish, not at save). It becomes `blocking` only after a publish attempt,
 * never while the tenant is typing, because otherwise a half-written draft is
 * a wall of errors.
 *
 * `blocking` deliberately renders as the invalid treatment rather than a third
 * colour: a field that blocks publish and a field that failed validation are
 * the same thing to the tenant.
 */
export type Gap = 'none' | 'pending' | 'blocking';

export interface FieldChromeInput {
  readonly disabled?: boolean | undefined;
  readonly error?: string | undefined;
  readonly gap?: Gap | undefined;
  /**
   * Draws the focus ring without the control holding focus. For the reference
   * matrix at /dev/fields only, which has to show a focus row it cannot focus
   * — the mock draws it the same way, as a static `.inp.foc`. Never set in
   * product code: real focus is `:focus-visible`.
   */
  readonly demoFocus?: boolean | undefined;
}

/* Geometry and type only. No colour: every colour is set by exactly one of the
   four state branches, so none of them has to outrank a default set here. */
const BASE =
  'block w-full rounded-field border px-[9px] py-[7px] font-sans text-[13px] leading-[1.35]';

/* The one focus ring. `focus-visible` rather than `focus` so a pointer click
   does not draw it, per NFR-A11Y-2's "visible focus indicator" read against
   keyboard use. */
const RING =
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent focus-visible:border-accent';

/* The same ring, drawn statically. Kept beside RING so the two cannot drift.
   The border colour is applied separately — see `controlClass`. */
const RING_STATIC = 'outline-2 outline-offset-1 outline-accent';

/* Sets neither background nor border, so it never competes with a treatment. */
const PLACEHOLDER = 'placeholder:text-ink3';

/**
 * The four treatments, split by CSS property.
 *
 * Every Tailwind utility lands at the same specificity, so two classes setting
 * one property are resolved by their order in the generated stylesheet rather
 * than by the order they are concatenated in. Splitting each treatment into
 * `fill`, `borderColor` and `borderStyle` is what guarantees exactly one class
 * per property reaches the element — the alternative is a string that looks
 * right and renders as whichever utility Tailwind happened to emit last.
 */
interface Treatment {
  readonly fill: string;
  readonly borderColor: string;
  readonly borderStyle: string;
}

const TREATMENTS = {
  resting: {
    fill: 'bg-field text-ink',
    borderColor: 'border-line-strong',
    borderStyle: 'border-solid',
  },
  /* The one invalid treatment. Reached by a validation error and by a blocking
     publish gap, which are the same state wearing two names. */
  invalid: {
    fill: 'bg-danger-soft text-ink',
    borderColor: 'border-danger',
    borderStyle: 'border-solid',
  },
  /* The publish-only marker: dashed, grey, no red. */
  pending: {
    fill: 'bg-field text-ink',
    borderColor: 'border-line-strong',
    borderStyle: 'border-dashed',
  },
  disabled: {
    fill: 'cursor-not-allowed bg-surface2 text-ink3',
    borderColor: 'border-line',
    borderStyle: 'border-dashed',
  },
} as const satisfies Record<string, Treatment>;

/** True when the control must carry `aria-invalid` and the red treatment. */
export function isInvalid(input: FieldChromeInput): boolean {
  return Boolean(input.error) || input.gap === 'blocking';
}

/** The control's className. The only place these classes are assembled. */
export function controlClass(
  input: FieldChromeInput,
  extra?: string,
): string {
  /* Exactly one treatment, never two. */
  const treatment: Treatment = input.disabled
    ? TREATMENTS.disabled
    : isInvalid(input)
      ? TREATMENTS.invalid
      : input.gap === 'pending'
        ? TREATMENTS.pending
        : TREATMENTS.resting;

  const parts = [
    BASE,
    RING,
    PLACEHOLDER,
    treatment.fill,
    treatment.borderStyle,
    /* The static ring recolours the border, so it replaces the treatment's
       border colour rather than being appended after it. */
    input.demoFocus ? 'border-accent' : treatment.borderColor,
  ];

  if (input.demoFocus) parts.push(RING_STATIC);
  if (extra) parts.push(extra);

  return parts.join(' ');
}

/**
 * The ids a control points `aria-describedby` at.
 *
 * Hint and error are both referenced, and in that order, so a screen reader
 * reaches the guidance as well as the failure. Returns undefined rather than
 * an empty string when there is nothing to describe, because `aria-
 * describedby=""` is a dangling reference.
 */
export function describedBy(
  id: string,
  has: { hint?: boolean; error?: boolean; gapNote?: boolean },
): string | undefined {
  const ids = [
    has.hint ? `${id}-hint` : null,
    has.gapNote ? `${id}-gap` : null,
    has.error ? `${id}-error` : null,
  ].filter((value): value is string => value !== null);

  return ids.length > 0 ? ids.join(' ') : undefined;
}

/**
 * The 44x44 minimum hit area of NFR-A11Y-2, applied to icon-only controls.
 *
 * Grown as a centred pseudo-element rather than as padding or a min-size, so
 * the target is 44x44 while the control still occupies only the space the mock
 * draws it in. Padding would be simpler and is what the first attempt used,
 * but it inflates the element: a removable chip became 44px tall and wide
 * enough that a tag list stopped flowing inline. The pseudo-element is out of
 * flow, receives the pointer on the button's behalf, and changes no layout.
 *
 * The mock draws several icon-only controls at 28x28 or smaller, and this is
 * the one place it is corrected rather than reproduced.
 */
export const HIT_AREA =
  'relative inline-flex items-center justify-center ' +
  'after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 ' +
  'after:-translate-x-1/2 after:-translate-y-1/2 after:content-[""]';
