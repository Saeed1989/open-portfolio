import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { List } from '../components/ui/List';
import { SectionShell } from '../components/ui/SectionShell';
import { Text } from '../components/ui/Text';
import { copy } from '../content/copy';

export function Integrations() {
  const c = copy.integrations;

  return (
    <SectionShell tone="band" labelledBy="integrations-title">
      <Text size="eyebrow">{c.eyebrow}</Text>
      <Heading level={2} size="heading" id="integrations-title" className="mt-2.5">
        {c.title}
      </Heading>
      <Text tone="muted" className="mt-2 hidden max-w-155 md:block">
        {c.intro}
      </Text>

      <ul className="mt-7 grid gap-3.5 md:grid-cols-3">
        {c.items.map((item) => (
          <Card key={item.name} as="li" className="flex flex-col">
            <div className="mb-3.5 flex items-center gap-3">
              <Badge variant="mark">{item.mark}</Badge>
              <Heading level={3} size="title">
                {item.name}
              </Heading>
            </div>
            <List divided="between" className="flex flex-1 flex-col">
              <Text size="body-sm" tone="muted" className="flex-1 pb-3.5">
                {item.desc}
              </Text>
              <Text size="small" tone="subtle" mono className="pt-3.5">
                {item.fallback}
              </Text>
            </List>
          </Card>
        ))}
      </ul>
    </SectionShell>
  );
}
