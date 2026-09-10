import { JSDOM } from 'jsdom';

/**
 * Sanitises an SVG string to strip scripts and external references (FR-MED-3).
 * Removes: <script> elements, on* event handler attributes, href on non-<a>/<use> elements,
 * <use> elements pointing at external URLs.
 */
export function sanitiseSvg(svgString: string): string {
  const dom = new JSDOM(svgString, { contentType: 'image/svg+xml' });
  const doc = dom.window.document;

  // Remove <script> elements
  doc.querySelectorAll('script').forEach((el) => el.remove());

  // Remove on* event handler attributes from all elements
  doc.querySelectorAll('*').forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // Remove href on elements other than <a> and <use>
  doc.querySelectorAll('*:not(a):not(use)[href]').forEach((el) => {
    el.removeAttribute('href');
  });

  // Remove <use> elements pointing at external URLs
  doc.querySelectorAll('use').forEach((el) => {
    const href = el.getAttribute('href') ?? el.getAttribute('xlink:href') ?? '';
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) {
      el.remove();
    }
  });

  return doc.documentElement.outerHTML;
}
