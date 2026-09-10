import { Injectable } from '@nestjs/common';

// WCAG 2.1 relative luminance backgrounds
const LIGHT_BG = '#FFFFFF';
const DARK_BG = '#0F0F0F';
const MIN_CONTRAST = 4.5;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return [r, g, b];
}

function linearise(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function isCompliant(hex: string): boolean {
  return (
    contrastRatio(hex, LIGHT_BG) >= MIN_CONTRAST &&
    contrastRatio(hex, DARK_BG) >= MIN_CONTRAST
  );
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
    case gn: h = ((bn - rn) / d + 2) / 6; break;
    default: h = ((rn - gn) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hNorm = h / 360;
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  function hue2rgb(p: number, q: number, t: number): number {
    let tN = t;
    if (tN < 0) tN += 1;
    if (tN > 1) tN -= 1;
    if (tN < 1 / 6) return p + (q - p) * 6 * tN;
    if (tN < 1 / 2) return q;
    if (tN < 2 / 3) return p + (q - p) * (2 / 3 - tN) * 6;
    return p;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hNorm) * 255),
    Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Binary-search the HSL lightness axis to find the nearest compliant shade.
 * Tries the current lightness first, then moves toward the compliant range.
 */
function findNearestCompliant(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  // Try both directions (lighter and darker) and return whichever is closest
  function binarySearch(fromL: number, toL: number): string | null {
    let lo = fromL, hi = toL;
    let best: string | null = null;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const [cr, cg, cb] = hslToRgb(h, s, mid);
      const candidate = rgbToHex(cr, cg, cb);
      if (isCompliant(candidate)) {
        best = candidate;
        // Move back toward original to find closest
        if (fromL < toL) hi = mid;
        else lo = mid;
      } else {
        if (fromL < toL) lo = mid;
        else hi = mid;
      }
    }
    return best;
  }

  const lighter = binarySearch(l, 1.0);
  const darker = binarySearch(l, 0.0);

  if (!lighter && !darker) return '#595959'; // fallback — always compliant
  if (!lighter) return darker!;
  if (!darker) return lighter;

  // Return whichever is closer to the original lightness
  const [, , ll] = rgbToHsl(...hexToRgb(lighter));
  const [, , dl] = rgbToHsl(...hexToRgb(darker));
  return Math.abs(ll - l) <= Math.abs(dl - l) ? lighter : darker;
}

@Injectable()
export class ThemeService {
  validateAccentColour(hex: string): { ok: true } | { ok: false; nearest: string } {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      const nearest = findNearestCompliant('#595959');
      return { ok: false, nearest };
    }

    if (isCompliant(hex)) {
      return { ok: true };
    }

    return { ok: false, nearest: findNearestCompliant(hex) };
  }
}
