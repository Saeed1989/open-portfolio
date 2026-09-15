import { Badge } from '../components/ui/Badge';
import { BrowserFrame } from '../components/ui/BrowserFrame';
import { Heading } from '../components/ui/Heading';
import { List } from '../components/ui/List';
import { SectionShell } from '../components/ui/SectionShell';
import { Text } from '../components/ui/Text';
import { copy } from '../content/copy';

export function ExamplePortfolio() {
  const c = copy.example;

  return (
    <SectionShell tone="band" labelledBy="example-title">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-10">
        <div>
          <Text size="eyebrow">{c.eyebrow}</Text>
          <Heading level={2} size="heading" id="example-title" className="mt-2.5">
            {c.title}
          </Heading>
        </div>
        <Text size="body-sm" tone="muted" className="hidden max-w-90 md:block md:text-right">
          {c.aside}
        </Text>
      </div>

      <BrowserFrame slug={c.slug} host={copy.domain.suffix} label={c.frameLabel}>
        <List divided="between" className="px-5 py-6 md:px-14 md:pt-11 md:pb-10">
          <div className="flex justify-between gap-6 pb-7">
            <div>
              <Text size="heading" weight="semibold">
                {c.name}
              </Text>
              <Text tone="muted" className="mt-2 max-w-130">
                {c.bio}
              </Text>
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-1.5 md:flex">
              {c.meta.map((line) => (
                <Text key={line} size="small" tone="subtle" mono>
                  {line}
                </Text>
              ))}
            </div>
          </div>

          <div className="flex gap-11 pt-6.5">
            <div className="min-w-0 flex-1">
              <Text size="eyebrow" className="mb-4.5">
                {c.projectsLabel}
              </Text>
              <List as="ul" divided="all">
                {c.projects.map((project, index) => (
                  <li
                    key={project.name}
                    // the 390 artboard shows two projects
                    className={[
                      'flex-col gap-2 py-3 sm:flex-row sm:gap-7 sm:py-4',
                      index > 1 ? 'hidden sm:flex' : 'flex',
                    ].join(' ')}
                  >
                    <div className="min-w-0 flex-1">
                      <Text size="body-lg" weight="medium">
                        {project.name}
                      </Text>
                      <Text size="caption" tone="muted" className="mt-1">
                        {project.blurb}
                      </Text>
                      <Text size="micro" tone="label" mono className="mt-2 hidden sm:block">
                        {project.stack}
                      </Text>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5 sm:w-47.5">
                      <Text size="small" tone="success" mono>
                        {project.impact}
                      </Text>
                      <Text size="small" tone="subtle" mono className="hidden sm:block">
                        {project.role}
                      </Text>
                    </div>
                  </li>
                ))}
              </List>
            </div>

            <List divided="between" className="hidden w-65 shrink-0 lg:block">
              <div className="pb-6">
                <Text size="eyebrow" className="mb-4.5">
                  {c.skillsLabel}
                </Text>
                <ul className="flex flex-wrap gap-1.5">
                  {c.skills.map((skill) => (
                    <li key={skill}>
                      <Badge variant="chip">{skill}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-5">
                <Text size="eyebrow" className="mb-3">
                  {c.contactLabel}
                </Text>
                <Text size="caption" tone="muted">
                  {c.contact}
                </Text>
              </div>
            </List>
          </div>
        </List>
      </BrowserFrame>
    </SectionShell>
  );
}
