import { Heading } from '../components/ui/Heading';
import { List } from '../components/ui/List';
import { SectionShell } from '../components/ui/SectionShell';
import { Text } from '../components/ui/Text';
import { copy } from '../content/copy';

export function Faq() {
  const c = copy.faq;

  return (
    <SectionShell labelledBy="faq-title" className="flex flex-col gap-6 md:flex-row md:gap-20">
      <div className="md:w-75 md:shrink-0">
        <Text size="eyebrow">{c.eyebrow}</Text>
        <Heading level={2} size="heading" id="faq-title" className="mt-2.5">
          {c.title}
        </Heading>
      </div>

      <List as="dl" divided="all" className="min-w-0 flex-1">
        {c.items.map((item) => (
          <div key={item.question} className="flex flex-col gap-1.5 py-5.5 md:flex-row md:gap-8">
            <Text as="dt" size="body-lg" weight="medium" className="md:w-70 md:shrink-0">
              {item.question}
            </Text>
            <Text as="dd" size="body-sm" tone="muted" className="flex-1">
              {item.answer}
            </Text>
          </div>
        ))}
      </List>
    </SectionShell>
  );
}
