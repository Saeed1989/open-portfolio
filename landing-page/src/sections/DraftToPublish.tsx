import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { SectionShell } from '../components/ui/SectionShell';
import { Text } from '../components/ui/Text';
import { copy } from '../content/copy';

export function DraftToPublish() {
  const c = copy.publish;

  return (
    <SectionShell tone="band" labelledBy="publish-title">
      <Text size="eyebrow">{c.eyebrow}</Text>
      <Heading level={2} size="heading" id="publish-title" className="mt-2.5 mb-7">
        {c.title}
      </Heading>

      <ol className="grid gap-3.5 md:grid-cols-3">
        {c.steps.map((step, index) => (
          <Card key={step.title} as="li">
            <div className="mb-3 flex items-center gap-3">
              <Badge variant="step">{index + 1}</Badge>
              <Heading level={3} size="title">
                {step.title}
              </Heading>
            </div>
            <Text size="body-sm" tone="muted">
              {step.body}
            </Text>
            <Text size="small" tone="accent-strong" mono className="mt-4 hidden md:block">
              {step.tag}
            </Text>
          </Card>
        ))}
      </ol>
    </SectionShell>
  );
}
