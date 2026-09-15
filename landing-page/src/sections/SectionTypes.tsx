import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { SectionShell } from '../components/ui/SectionShell';
import { Text } from '../components/ui/Text';
import { copy } from '../content/copy';

export function SectionTypes() {
  const c = copy.sectionTypes;

  return (
    <SectionShell id="what-you-publish" labelledBy="types-title">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Text size="eyebrow">{c.eyebrow}</Text>
          <Heading level={2} size="heading" id="types-title" className="mt-2.5">
            {c.title}
          </Heading>
        </div>
        <div className="flex items-center gap-2.5">
          <Badge variant="swatch" />
          <Text as="span" size="caption" tone="muted">
            {c.legend}
          </Text>
        </div>
      </div>

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {c.items.map((item) => (
          <Card
            key={item.name}
            as="li"
            size="sm"
            variant={item.preset ? 'selected' : 'surface'}
            className="flex min-h-18.5 flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <Text as="span" size="body-sm" weight="medium">
                {item.name}
              </Text>
              {item.preset && <Badge variant="tag">{c.presetTag}</Badge>}
            </div>
            <Text as="span" size="small" tone="subtle">
              {item.desc}
            </Text>
          </Card>
        ))}
      </ul>

      <Text size="caption" tone="subtle" className="mt-4.5">
        {c.note}
      </Text>
    </SectionShell>
  );
}
