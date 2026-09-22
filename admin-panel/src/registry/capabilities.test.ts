import { describe, expect, test } from 'vitest';
import { OVERLAY } from './shim/capabilities';
import { DESCRIPTORS, descriptorFor, type FieldDescriptor } from './index';

/*
 * Invariant A, and the overlay that currently supplies it.
 *
 * These run over the *real* thirteen descriptors, not invented ones, because
 * the invariant is a claim about the content model rather than about the
 * validator — an invented descriptor could satisfy it while a shipped one
 * did not.
 */

function everyField(): Array<{ section: string; field: FieldDescriptor }> {
  return DESCRIPTORS.flatMap((descriptor) => {
    const fields =
      descriptor.cardinality === 'single'
        ? descriptor.fields
        : [...descriptor.itemFields, ...(descriptor.sectionFields ?? [])];
    return fields.map((field) => ({ section: descriptor.type, field }));
  });
}

describe('invariant A — hideable and publish-required are exclusive', () => {
  test('no field is both', () => {
    /*
     * The two together are a contradiction the tenant cannot resolve: publish
     * demands a value, and the tenant has said the value will not appear. It
     * is also what makes "hidden fields are not validated" safe — without the
     * invariant, hiding a field would be a way to skip a publish requirement.
     */
    const offenders = everyField()
      .filter(({ field }) => field.hideable === true && field.required === true)
      .map(({ section, field }) => `${section}.${field.key}`);

    expect(offenders).toEqual([]);
  });

  test('no hideable field carries a conditional requirement either', () => {
    /* `requiredWhen` is the same demand, arrived at by a different route. */
    const offenders = everyField()
      .filter(
        ({ field }) => field.hideable === true && field.requiredWhen !== undefined,
      )
      .map(({ section, field }) => `${section}.${field.key}`);

    expect(offenders).toEqual([]);
  });
});

describe('the overlay declares what the SRS says it should', () => {
  test('contact has five independently hideable links (FR-SEC-CON-2)', () => {
    const contact = descriptorFor('contact');
    expect(contact?.cardinality).toBe('single');
    if (contact?.cardinality !== 'single') throw new Error('unreachable');

    const hideable = contact.fields
      .filter((field) => field.hideable)
      .map((field) => field.key);
    expect(hideable).toEqual(['email', 'github', 'linkedin', 'x', 'site']);
  });

  test('education has four hideable fields, per entry (FR-SEC-EDU-1)', () => {
    const education = descriptorFor('education');
    expect(education?.cardinality).toBe('collection');
    if (education?.cardinality !== 'collection') throw new Error('unreachable');

    const hideable = education.itemFields
      .filter((field) => field.hideable)
      .map((field) => field.key);
    expect(hideable).toEqual(['gpa', 'coursework', 'scholarships', 'honours']);
  });

  test('achievements and trainings both carry the item publish flag', () => {
    /* trainings reuses the achievements schema verbatim (§4.1, FR-SEC-TRN-1),
       so it inherits the flag whether or not it has an importer of its own. */
    for (const type of ['achievements', 'trainings']) {
      const descriptor = descriptorFor(type);
      expect(descriptor?.cardinality).toBe('collection');
      if (descriptor?.cardinality !== 'collection') throw new Error('unreachable');
      expect(descriptor.itemPublishFlag, `${type} lacks the flag`).toBe(true);
    }
  });

  test('no other section carries the item publish flag', () => {
    /* §5.2 calls it "the only per-item publish flag in the model". */
    const flagged = DESCRIPTORS.filter(
      (d) => d.cardinality === 'collection' && d.itemPublishFlag,
    ).map((d) => d.type);
    expect(flagged.sort()).toEqual(['achievements', 'trainings']);
  });

  test('every overlaid key names a field the package really declares', () => {
    /* The overlay may only mark what exists. A typo would silently mark
       nothing, and the field would render with no toggle. */
    for (const [section, keys] of Object.entries(OVERLAY.hideableFields)) {
      const descriptor = descriptorFor(section);
      expect(descriptor, `${section} is not a declared section type`).toBeDefined();
      if (!descriptor) continue;

      const declared = new Set(
        (descriptor.cardinality === 'single'
          ? descriptor.fields
          : descriptor.itemFields
        ).map((field) => field.key),
      );
      for (const key of keys) {
        expect(declared.has(key), `${section}.${key} is not declared`).toBe(true);
      }
    }
  });

  test('the overlay touches nothing outside the six scope items', () => {
    /* Scope creep here is invisible at runtime and permanent in practice. */
    expect(Object.keys(OVERLAY.hideableFields).sort()).toEqual([
      'contact',
      'education',
    ]);
    expect([...OVERLAY.itemPublishFlag].sort()).toEqual([
      'achievements',
      'trainings',
    ]);
  });
});
