import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

const { window } = new JSDOM('');
const purify = DOMPurify(window as unknown as Window);

const ALLOWED_TAGS = ['p', 'ul', 'ol', 'li', 'strong', 'em', 'u', 'br'];
const ALLOWED_ATTR: string[] = [];

/**
 * Sanitises rich-text HTML to the allowed subset.
 * Run at write time before storage — what is stored is already safe.
 * The render path injects stored markup directly and is safe only for that reason.
 *
 * Allowed tags: p, ul, ol, li, strong, em, u, br
 * No attributes on any admitted tag.
 * No anchors, images, scripts, styles, or iframes.
 */
export function sanitiseRichText(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORCE_BODY: true,
  });
}
