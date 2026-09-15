import { Badge } from '../components/ui/Badge';
import { BrowserFrame } from '../components/ui/BrowserFrame';
import { Heading } from '../components/ui/Heading';
import { List } from '../components/ui/List';
import { SectionShell } from '../components/ui/SectionShell';
import { Text } from '../components/ui/Text';
import { copy } from '../content/copy';

function Preview({ tone }: { tone: 'light' | 'dark' }) {
  const c = copy.theming;
  const p = c.preview;
  const light = tone === 'light';

  return (
    <div className="min-w-0 flex-1">
      <Text size="eyebrow" className="mb-2.5">
        {light ? c.lightLabel : c.darkLabel}
      </Text>
      <BrowserFrame
        slug={copy.example.slug}
        host={copy.domain.suffix}
        label={light ? p.frameLabelLight : p.frameLabelDark}
        tone={tone}
        size="sm"
      >
        <div className="p-5">
          <Text size="body-lg" weight="semibold" tone={light ? 'light' : 'default'}>
            {p.name}
          </Text>
          <Text size="small" tone={light ? 'light-muted' : 'muted'} className="mt-1">
            {p.role}
          </Text>
          <Text size="eyebrow" tone={light ? 'light-muted' : 'label'} className="mt-4 mb-1">
            {p.projectsLabel}
          </Text>
          <List as="ul" divided="all" tone={tone}>
            {p.projects.map((project) => (
              <li key={project.name} className="py-2.5">
                <Text size="caption" weight="medium" tone={light ? 'light' : 'default'}>
                  {project.name}
                </Text>
                <Text size="micro" mono tone={light ? 'light-muted' : 'muted'} className="mt-0.5">
                  {project.impact}
                </Text>
              </li>
            ))}
          </List>
          <Badge variant="cta" className="mt-3">
            {p.cta}
          </Badge>
        </div>
      </BrowserFrame>
    </div>
  );
}

export function Theming() {
  const c = copy.theming;

  return (
    <SectionShell labelledBy="theming-title">
      <Text size="eyebrow">{c.eyebrow}</Text>
      <Heading level={2} size="heading" id="theming-title" className="mt-2.5 mb-7">
        {c.title}
      </Heading>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        <div className="lg:w-75 lg:shrink-0">
          <List as="dl" divided="all">
            {c.dials.map((dial) => (
              <div key={dial.term} className="py-4">
                <Text as="dt" size="caption" weight="medium">
                  {dial.term}
                </Text>
                <Text as="dd" size="caption" tone="subtle" className="mt-1">
                  {dial.desc}
                </Text>
              </div>
            ))}
          </List>
          <Text size="small" tone="subtle" className="mt-4">
            {c.note}
          </Text>
        </div>

        <div className="flex min-w-0 flex-1 gap-2.5 sm:gap-4">
          <Preview tone="light" />
          <Preview tone="dark" />
        </div>
      </div>
    </SectionShell>
  );
}
