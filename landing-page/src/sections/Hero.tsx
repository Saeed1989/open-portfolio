import { ClaimForm } from '../components/ClaimForm';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Heading } from '../components/ui/Heading';
import { List } from '../components/ui/List';
import { SectionShell } from '../components/ui/SectionShell';
import { Text } from '../components/ui/Text';
import { copy } from '../content/copy';

export function Hero() {
  const c = copy.hero;

  return (
    <SectionShell
      tone="hero"
      labelledBy="hero-title"
      flush
      className="flex flex-col gap-12 pt-24 pb-8 md:pt-44 md:pb-22 lg:flex-row lg:items-start lg:gap-18"
    >
      <div className="min-w-0 flex-1">
        <Badge variant="pill" dot>
          {c.eyebrow}
        </Badge>
        <Heading
          level={1}
          size="display"
          id="hero-title"
          accent={c.titleAccent}
          className="mt-6 max-w-165"
        >
          {c.title}
        </Heading>
        <Text size="lead" tone="muted" className="mt-5 max-w-140">
          {c.lead}
        </Text>
        <ClaimForm id="claim" size="lg" className="mt-8 max-w-152" />
        <Text size="caption" tone="subtle" className="mt-1.5 max-w-152">
          {c.finePrint}
        </Text>
      </div>

      <Card className="hidden w-74 shrink-0 lg:block">
        <Text size="eyebrow" className="mb-4">
          {c.howItWorks.title}
        </Text>
        <List divided="between">
          <ol className="flex flex-col gap-3 pb-4.5">
            {c.howItWorks.steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <Text as="span" size="small" tone="accent" mono weight="medium" className="w-3.5 shrink-0">
                  {index + 1}
                </Text>
                <Text as="span" size="caption" tone="muted">
                  {step}
                </Text>
              </li>
            ))}
          </ol>
          <Text size="small" tone="subtle" className="pt-4">
            {c.howItWorks.note}
          </Text>
        </List>
      </Card>
    </SectionShell>
  );
}
