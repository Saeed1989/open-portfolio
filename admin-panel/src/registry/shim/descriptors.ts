import type {
  SectionDescriptor,
  SingleSectionDescriptor,
} from './types';

/*
 * TEMPORARY. Two descriptors, written from srs.md, standing in until
 * `@portfolio/registry` can express them.
 *
 * The package already declares a `hero` and a `contact`. They are not used
 * here for two reasons, both recorded in the report:
 *
 *   - `hero.ctas` is declared as `{ kind: 'list', max: 2 }`, which a
 *     descriptor-driven renderer cannot turn into FR-SEC-HERO-2's typed
 *     choice. The package's *TypeScript* side gets this right — `content.ts`
 *     has `Cta { kind, label, href }` — so the type and the descriptor
 *     disagree about the same field, and FR-REG-1 makes the descriptor the
 *     runtime source of truth.
 *   - `contact`'s links carry no `hideable`, so nothing tells the renderer to
 *     draw FR-SEC-CON-2's per-link toggle, even though the package's
 *     `ContactLink` type already has `visible: boolean`.
 *
 * Everything else about the package's two descriptors is reproduced as it
 * stands, so the swap is a deletion rather than a reconciliation.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export const hero = {
  type: 'hero',
  label: 'Hero',
  description: 'The first thing a reader sees.',
  priority: 'must',
  businessRef: 'BR 1',
  cardinality: 'single',
  fields: [
    {
      key: 'name',
      label: 'Name',
      kind: 'text',
      required: true,
      group: 'intro',
      placeholder: 'Your full name',
      help: 'Shown in the hero and used in the default page title.',
    },
    {
      key: 'title',
      label: 'Professional title',
      kind: 'text',
      required: true,
      group: 'intro',
      placeholder: 'Staff Backend Engineer',
      help: 'The role, not the company.',
    },
    {
      key: 'tagline',
      label: 'Tagline',
      kind: 'text',
      group: 'intro',
      max: 120,
      help: 'One or two lines stating your specialisation.',
    },
    {
      /*
       * Not required. FR-SEC-HERO-1 lists bio among the fields and marks only
       * name and title as required; the mock's editor draws "Bio *" but the
       * mock's own registry panel beside it shows `bio textarea` with no
       * publish marker, so the mock disagrees with itself and the SRS breaks
       * the tie. Reported.
       */
      key: 'bio',
      label: 'Short bio',
      kind: 'longtext',
      group: 'intro',
      max: 600,
      help: 'Two or three sentences on your focus area and approach.',
    },
    {
      key: 'avatar',
      label: 'Avatar',
      kind: 'image',
      group: 'portrait',
      help: 'Removing it reflows the hero — no gap, no placeholder.',
    },
    /*
     * FR-SEC-HERO-2: a typed choice, with a label and a target.
     *
     * The CTA as a whole is optional, because FR-SEC-HERO-1 marks only name
     * and title required. What is not optional is a half-filled one: choose a
     * type and the label and target become required. That reading satisfies
     * the SRS (nothing is forced) and the mock (the asterisks appear once a
     * type is chosen) at the same time.
     */
    {
      key: 'ctaType',
      label: 'CTA type',
      kind: 'enum',
      group: 'cta',
      options: ['resume', 'schedule', 'url'],
      optionLabels: {
        resume: 'Résumé download',
        schedule: 'Scheduling link',
        url: 'External URL',
      },
      help: 'The target field follows the type.',
    },
    {
      key: 'ctaLabel',
      label: 'CTA label',
      kind: 'text',
      group: 'cta',
      placeholder: 'Download résumé',
      requiredWhen: { field: 'ctaType', present: true },
    },
    {
      key: 'ctaTarget',
      label: 'CTA target',
      kind: 'url',
      group: 'cta',
      requiredWhen: { field: 'ctaType', present: true },
      help: 'Where the button goes.',
    },
  ],
  /*
   * The mock's registry panel states `!name && !title`. The package instead
   * requires all six of its fields to be blank. They disagree: a hero holding
   * only a bio survives under the package's rule and is dropped under the
   * mock's. The mock's is followed here because FR-SEC-HERO-1 makes name and
   * title the two required fields, and a hero without either cannot render a
   * heading. Reported.
   */
  emptyCondition: (content) =>
    !isRecord(content) || (!hasText(content.name) && !hasText(content.title)),
} as const satisfies SingleSectionDescriptor;

export const contact = {
  type: 'contact',
  label: 'Contact',
  description:
    'Five links, each with an independent visibility toggle. A hidden link keeps its value and is not rendered.',
  priority: 'must',
  businessRef: 'BR 4',
  cardinality: 'single',
  /*
   * FR-SEC-CON-1's five fields, in its order, each hideable per FR-SEC-CON-2.
   *
   * The package's descriptor additionally declares an `intro` longtext. It is
   * not here: neither FR-SEC-CON-1 nor the mock's Contact artboard has one.
   * Reported rather than silently kept or silently dropped.
   *
   * None is required. FR-SEC-CON-1 marks none, and FR-SEC-CON-3 only governs
   * how a published address is rendered. The mock marks "Email *". The SRS
   * wins; reported.
   */
  fields: [
    {
      key: 'email',
      label: 'Email',
      kind: 'email',
      hideable: true,
      group: 'links',
      placeholder: 'you@example.com',
      help: 'Published as a client-assembled mailto, so naive scrapers do not read it out of the HTML.',
    },
    {
      key: 'github',
      label: 'GitHub',
      kind: 'link',
      hideable: true,
      group: 'links',
      placeholder: 'github.com/you',
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      kind: 'link',
      hideable: true,
      group: 'links',
      placeholder: 'linkedin.com/in/you',
    },
    {
      key: 'x',
      label: 'X',
      kind: 'link',
      hideable: true,
      group: 'links',
      placeholder: 'x.com/you',
    },
    {
      key: 'site',
      label: 'Personal site',
      kind: 'link',
      hideable: true,
      group: 'links',
      placeholder: 'yoursite.dev',
    },
  ],
  /*
   * Reproduced from the package unchanged, and it matches the mock's stated
   * rule: "Hiding every link empties the section, so Contact stops appearing
   * even while enabled."
   */
  emptyCondition: (content) => {
    if (!isRecord(content)) return true;
    return !['email', 'github', 'linkedin', 'x', 'site'].some((key) => {
      const link = content[key];
      return isRecord(link) && link.visible === true && hasText(link.value);
    });
  },
} as const satisfies SingleSectionDescriptor;

export const SHIM_DESCRIPTORS: readonly SectionDescriptor[] = [hero, contact];
