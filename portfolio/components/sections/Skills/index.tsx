import {
  REGISTRY,
  type SkillItem,
  type SkillsContent,
} from '@openportfolio/registry';
import {
  Card,
  Grid,
  Heading,
  ProgressBar,
  SectionShell,
  Stack,
  Text,
} from '@/components/ui';
import { fieldRuns, renderRuns, type RunWrappers } from '../fields';

/**
 * Skills (business req 3, FR-SEC-SKILL-*).
 *
 * One array feeds both tiers (FR-SEC-SKILL-1): `prominent` is a flag on a
 * skill, not a second list, so a rating is stored once and can never disagree
 * between the two views.
 *
 * FR-SEC-SKILL-4 — every prominent card draws its bar in `var(--accent)` by
 * way of ProgressBar. There is no per-skill colour to configure, so the set
 * reads as "featured", not "ranked".
 *
 * FR-SEC-SKILL-6 — the detailed tier passes `size="sm"`, which selects the
 * `--size-bar-sm` theme constant. The height is not a tenant setting and not a
 * number this component knows.
 *
 * FR-SEC-SKILL-7 — the rating is rendered as text beside every bar, in both
 * tiers. ProgressBar additionally carries it as an ARIA value; neither bar
 * length nor colour is ever the only carrier.
 */
function ratingText(rating: number): string {
  return `${rating}/10`;
}

const SKILL_RENDERERS = {
  name: (skill: SkillItem) => <Text variant="skill">{skill.name}</Text>,
  rating: (skill: SkillItem) => (
    <Text variant="fine" tone="muted" className="whitespace-nowrap">
      {ratingText(skill.rating)}
    </Text>
  ),
};

const DETAIL_RENDERERS = {
  name: (skill: SkillItem) => <Text variant="detail">{skill.name}</Text>,
  rating: (skill: SkillItem) => (
    <Text variant="meta" tone="muted" className="whitespace-nowrap">
      {ratingText(skill.rating)}
    </Text>
  ),
};

const PROMINENT_WRAPPERS: RunWrappers = {
  headline: (nodes) => (
    <Stack
      direction="row"
      wrap
      align="baseline"
      justify="between"
      gapX="12"
      gapY="4"
      className="mb-12"
    >
      {nodes}
    </Stack>
  ),
};

const DETAIL_WRAPPERS: RunWrappers = {
  headline: (nodes) => (
    <Stack
      direction="row"
      wrap
      align="baseline"
      justify="between"
      gapX="12"
      gapY="2"
      className="mb-5"
    >
      {nodes}
    </Stack>
  ),
};

const { itemFields } = REGISTRY.skills;

function ProminentSkill({ skill }: { skill: SkillItem }) {
  return (
    <Card as="li" padding="snug" radius="md">
      {renderRuns(
        fieldRuns(itemFields, skill, SKILL_RENDERERS),
        PROMINENT_WRAPPERS,
      )}
      <ProgressBar
        size="lg"
        value={skill.rating}
        label={skill.name}
        valueText={`${skill.rating} out of 10`}
      />
    </Card>
  );
}

function DetailedSkill({ skill }: { skill: SkillItem }) {
  return (
    <Stack as="li" gap="0">
      {renderRuns(
        fieldRuns(itemFields, skill, DETAIL_RENDERERS),
        DETAIL_WRAPPERS,
      )}
      <ProgressBar
        size="sm"
        value={skill.rating}
        label={skill.name}
        valueText={`${skill.rating} out of 10`}
      />
    </Stack>
  );
}

interface SkillGroup {
  label: string;
  items: SkillItem[];
}

/**
 * Groups by the tenant's category list, in the tenant's order. Categories with
 * no skills are dropped (FR-SEC-SKILL-8). A skill whose category is not on the
 * list is not silently lost — its category is appended after the declared
 * ones, so removing a category from the list never deletes content from view.
 */
function groupByCategory(
  items: readonly SkillItem[],
  categories: readonly string[],
): SkillGroup[] {
  const declared = categories ?? [];
  const extra = items
    .map((skill) => skill.category)
    .filter((category) => category && !declared.includes(category))
    .filter((category, index, all) => all.indexOf(category) === index);

  return [...declared, ...extra]
    .map((label) => ({
      label,
      items: items
        .filter((skill) => skill.category === label)
        .slice()
        .sort((a, b) => b.rating - a.rating),
    }))
    .filter((group) => group.items.length > 0);
}

export function Skills({ content }: { content: SkillsContent }) {
  const items = content.items ?? [];
  const prominent = items.filter((skill) => skill.prominent);
  const groups = groupByCategory(items, content.categories ?? []);

  return (
    <SectionShell
      id="skills"
      heading={REGISTRY.skills.label}
      description={content.legend}
      descriptionMeasure="legend"
    >
      {prominent.length > 0 ? (
        <Grid
          as="ul"
          tracks="skills"
          gap="skill-gap"
          className="mb-block-gap"
          label="Prominent skills"
        >
          {prominent.map((skill) => (
            <ProminentSkill key={skill.id} skill={skill} />
          ))}
        </Grid>
      ) : null}

      {groups.length > 0 ? (
        <>
          <Heading level={2} visual="subheading" className="mb-heading-gap">
            All skills
          </Heading>
          <Grid tracks="groups" gap="group-gap">
            {groups.map((group) => (
              <Stack key={group.label} gap="0">
                <Heading level={3} visual="group" className="mb-10">
                  {group.label}
                </Heading>
                <Stack as="ul" gap="12">
                  {group.items.map((skill) => (
                    <DetailedSkill key={skill.id} skill={skill} />
                  ))}
                </Stack>
              </Stack>
            ))}
          </Grid>
        </>
      ) : null}
    </SectionShell>
  );
}
