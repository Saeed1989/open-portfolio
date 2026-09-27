import { ClaimForm } from '../components/ClaimForm';
import { Heading } from '../components/ui/Heading';
import { SectionShell } from '../components/ui/SectionShell';
import { Text } from '../components/ui/Text';
import { copy } from '../content/copy';

export function ClosingCta() {
  const c = copy.cta;

  return (
    <SectionShell
      tone="cta"
      labelledBy="cta-title"
      className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-15"
    >
      <div>
        <Heading level={2} size="cta" id="cta-title" className="max-w-130">
          {c.title}
        </Heading>
        <Text tone="muted" className="mt-3 max-w-120">
          {c.body}
        </Text>
      </div>
      <ClaimForm size="lg" className="w-full lg:max-w-150" />
    </SectionShell>
  );
}
