import { SectionShell } from '../components/ui/SectionShell';
import { Text } from '../components/ui/Text';
import { copy } from '../content/copy';

export function SiteFooter() {
  return (
    <SectionShell as="footer" tone="band" flush className="py-6">
      <Text size="caption" tone="muted">
        {copy.footer.copyright}
      </Text>
    </SectionShell>
  );
}
