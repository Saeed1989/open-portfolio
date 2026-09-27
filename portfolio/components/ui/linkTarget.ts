/**
 * Every link on the portfolio opens in a new tab, so a visitor never loses
 * the page. The one exception is a same-page fragment (`#projects`), which
 * only scrolls and would be broken by a new tab.
 *
 * `noopener noreferrer` stops the opened page reaching back through
 * `window.opener`.
 */
export function linkTargetProps(href: string) {
  if (href.startsWith('#')) return {};
  return { target: '_blank', rel: 'noopener noreferrer' } as const;
}
