import { ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Link } from '../components/ui/Link';
import { Logo } from '../components/ui/Logo';
import { copy } from '../content/copy';

export function SiteHeader() {
  const { nav, brand, links } = copy;

  return (
    <header className="absolute inset-x-0 top-0 z-10 px-3 pt-3 md:px-6 md:pt-4">
      <Card variant="glass" size="bar" className="mx-auto flex max-w-348 items-center justify-between">
        <Logo href="/" mark={brand.mark} name={brand.name} />
        <nav aria-label={nav.label}>
          <ul className="flex items-center gap-4 md:gap-7">
            <li className="hidden md:block">
              <Link href={nav.features.href} variant="nav">
                {nav.features.label}
              </Link>
            </li>
            <li>
              <Link href={links.signIn} variant="nav">
                {nav.signIn}
              </Link>
            </li>
            <li className="hidden md:block">
              <ButtonLink href={nav.claim.href} size="sm">
                {nav.claim.label}
              </ButtonLink>
            </li>
          </ul>
        </nav>
      </Card>
    </header>
  );
}
