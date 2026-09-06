import { headers } from 'next/headers';
import { getPortfolio } from '@/lib/api';
import { SLUG_HEADER } from '@/lib/tenant';
import {
  fontStylesheetHref,
  themeAttribute,
  themeStyle,
  type PortfolioTheme,
} from '@/lib/theme';
import './globals.css';

/**
 * The document shell.
 *
 * FR-THM-2: the tenant's theme renders as CSS custom properties on <html>.
 * Only configured values are written, so everything the tenant has not chosen
 * keeps the token layer's own value from globals.css — there is no per-tenant
 * stylesheet, and nothing about a theme is baked into the build.
 *
 * NOTE — the container (app/page.tsx) owns the payload, but an app-router
 * layout cannot receive props from the page it wraps, and only the layout
 * renders <html>. So the layout reads the theme itself. This does not cost a
 * second upstream read: `getPortfolio` is wrapped in React's `cache()`, so the
 * layout, `generateMetadata` and the page share one call per request. The
 * layout takes the theme and nothing else — it never sees sections.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await currentTheme();

  return (
    <html
      lang="en"
      data-theme={themeAttribute(theme)}
      style={themeStyle(theme)}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        {/* The pairing is chosen from a curated list in lib/theme.ts, so a
            tenant supplies an id, never a URL. */}
        <link href={fontStylesheetHref(theme)} rel="stylesheet" />
      </head>
      {/* Browser extensions — Grammarly, password managers, translators —
          write their own attributes onto <body> before React hydrates, which
          React reports as a mismatch it cannot patch up. The markup here has
          no attributes at all, so there is nothing of ours to disagree about.
          This suppresses the warning for this element's own attributes and
          text only; it does not extend to children, so a genuine mismatch
          inside the page is still reported. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

/**
 * A host with no tenant, or a tenant with nothing published, gets the default
 * theme — the 404 is branded, and rendering it must not depend on a payload.
 */
async function currentTheme(): Promise<PortfolioTheme | undefined> {
  const slug = (await headers()).get(SLUG_HEADER);
  if (!slug) return undefined;

  const portfolio = await getPortfolio(slug);
  return portfolio?.theme;
}
