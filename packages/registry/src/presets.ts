import { REGISTRY } from './sections';
import { SECTION_TYPES, type SectionInstance } from './types';

/**
 * Presets (FR-REG-6, FR-REG-10): named starting configurations, applied once
 * at portfolio creation. A preset only sets initial state; everything it
 * produces is editable afterwards.
 */
export const PRESET_IDS = ['software-engineer'] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export interface InitialDraft {
  readonly sections: SectionInstance[];
  readonly theme: Record<string, unknown>;
  readonly seo: Record<string, unknown>;
  readonly analytics: null;
}

interface Preset {
  readonly enabled: readonly string[];
  /** Content a section starts with beyond its empty shape. */
  readonly content: Partial<Record<string, Record<string, unknown>>>;
}

const PRESETS: Record<PresetId, Preset> = {
  'software-engineer': {
    enabled: ['hero', 'projects', 'skills', 'contact'],
    content: {
      skills: {
        categories: [
          'Backend',
          'Frontend',
          'Database',
          'DevOps',
          'Tools & Practices',
        ],
      },
    },
  },
};

export function isPresetId(value: unknown): value is PresetId {
  return (PRESET_IDS as readonly unknown[]).includes(value);
}

/**
 * The initial draft tree for a preset (FR-REG-10): one entry per declared
 * section type, in registry order, enabled and defaulted as the preset sets.
 * Pure — reads no environment and touches no database.
 *
 * `name` is the display name collected on the creation screen (FR-AUTH-5).
 * It lands in the hero's `name` here, so the caller need not know that key.
 */
export function createInitialDraft(
  presetId: PresetId,
  options: { name?: string } = {},
): InitialDraft {
  const preset = PRESETS[presetId];

  const sections = SECTION_TYPES.map((type, order): SectionInstance => {
    const base: Record<string, unknown> =
      REGISTRY[type].cardinality === 'collection' ? { items: [] } : {};
    const content = { ...base, ...preset.content[type] };
    if (type === 'hero' && options.name !== undefined) {
      content.name = options.name;
    }
    return { type, enabled: preset.enabled.includes(type), order, content };
  });

  return { sections, theme: {}, seo: {}, analytics: null };
}
