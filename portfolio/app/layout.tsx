import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'A portfolio published with openportfolio.',
};

/**
 * The document shell.
 *
 * `data-theme` is set to the light default here and is expected to be
 * rewritten at runtime — the whole token layer is plain custom properties for
 * exactly this reason. Nothing about the theme is baked into the build.
 *
 * Fonts are loaded the way the approved design loads them, over the Google
 * Fonts CDN with display=swap. Moving to next/font would self-host them and
 * remove the third-party connection; that is worth doing before launch but
 * changes the token values, so it is left as a deliberate follow-up.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Spline+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
