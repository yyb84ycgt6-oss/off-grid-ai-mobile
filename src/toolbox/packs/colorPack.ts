/**
 * Color Lab pack — HEX/RGB/HSL/CMYK conversions, palettes, contrast, blends.
 */
import { ToolboxTool } from '../types';

const t = (
  id: string,
  name: string,
  description: string,
  inputHint: string,
  run: (s: string) => string,
  tags: string[] = [],
  example?: string
): ToolboxTool => ({
  id, name, description, category: 'color', tags: ['color', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const parseHex = (s: string): [number, number, number] | null => {
  let h = s.trim().replace(/^#/, '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const toHex = (r: number, g: number, b: number): string => '#' + [r, g, b].map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
};
const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (tv: number) => {
    if (tv < 0) tv += 1; if (tv > 1) tv -= 1;
    if (tv < 1 / 6) return p + (q - p) * 6 * tv;
    if (tv < 1 / 2) return q;
    if (tv < 2 / 3) return p + (q - p) * (2 / 3 - tv) * 6;
    return p;
  };
  return [Math.round(hue(h + 1 / 3) * 255), Math.round(hue(h) * 255), Math.round(hue(h - 1 / 3) * 255)];
};
const luminance = (r: number, g: number, b: number): number => {
  const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};

export const colorPack: ToolboxTool[] = [
  t('color-hex-rgb', 'HEX → RGB', 'Convert a hex color to RGB.', 'a hex color', (s) => {
    const c = parseHex(s); return c ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : 'Enter a hex color (e.g. #3B82F6).';
  }, ['convert'], '#3B82F6'),
  t('color-rgb-hex', 'RGB → HEX', 'Convert RGB to hex. Format: r,g,b', 'r,g,b', (s) => {
    const p = (s.match(/\d+/g) || []).map(Number); return p.length >= 3 ? toHex(p[0], p[1], p[2]) : 'Format: r,g,b  (e.g. 59,130,246)';
  }, ['convert'], '59,130,246'),
  t('color-hex-hsl', 'HEX → HSL', 'Convert a hex color to HSL.', 'a hex color', (s) => {
    const c = parseHex(s); if (!c) return 'Enter a hex color.'; const [h, sa, l] = rgbToHsl(...c); return `hsl(${h}, ${sa}%, ${l}%)`;
  }, ['convert'], '#3B82F6'),
  t('color-hsl-hex', 'HSL → HEX', 'Convert HSL to hex. Format: h,s,l', 'h,s,l', (s) => {
    const p = (s.match(/\d+/g) || []).map(Number); if (p.length < 3) return 'Format: h,s,l  (e.g. 217,91,60)'; return toHex(...hslToRgb(p[0], p[1], p[2]));
  }, ['convert'], '217,91,60'),
  t('color-hex-cmyk', 'HEX → CMYK', 'Convert a hex color to CMYK percentages.', 'a hex color', (s) => {
    const c = parseHex(s); if (!c) return 'Enter a hex color.';
    const [r, g, b] = c.map((v) => v / 255); const k = 1 - Math.max(r, g, b);
    if (k === 1) return 'cmyk(0%, 0%, 0%, 100%)';
    const cy = (1 - r - k) / (1 - k), m = (1 - g - k) / (1 - k), y = (1 - b - k) / (1 - k);
    return `cmyk(${Math.round(cy * 100)}%, ${Math.round(m * 100)}%, ${Math.round(y * 100)}%, ${Math.round(k * 100)}%)`;
  }, ['convert'], '#3B82F6'),
  t('color-complement', 'Complementary Color', 'Find the opposite hue on the color wheel.', 'a hex color', (s) => {
    const c = parseHex(s); if (!c) return 'Enter a hex color.'; const [h, sa, l] = rgbToHsl(...c);
    return `Base: ${toHex(...c)}\nComplement: ${toHex(...hslToRgb((h + 180) % 360, sa, l))}`;
  }, ['palette'], '#3B82F6'),
  t('color-triadic', 'Triadic Palette', 'Three evenly spaced hues.', 'a hex color', (s) => {
    const c = parseHex(s); if (!c) return 'Enter a hex color.'; const [h, sa, l] = rgbToHsl(...c);
    return [0, 120, 240].map((d) => toHex(...hslToRgb((h + d) % 360, sa, l))).join('\n');
  }, ['palette'], '#3B82F6'),
  t('color-analogous', 'Analogous Palette', 'Five neighboring hues (±30° steps).', 'a hex color', (s) => {
    const c = parseHex(s); if (!c) return 'Enter a hex color.'; const [h, sa, l] = rgbToHsl(...c);
    return [-60, -30, 0, 30, 60].map((d) => toHex(...hslToRgb((h + d + 360) % 360, sa, l))).join('\n');
  }, ['palette'], '#3B82F6'),
  t('color-shades', 'Shades & Tints', 'Nine steps from dark to light.', 'a hex color', (s) => {
    const c = parseHex(s); if (!c) return 'Enter a hex color.'; const [h, sa] = rgbToHsl(...c);
    return [10, 20, 30, 40, 50, 60, 70, 80, 90].map((l) => `${String(l).padStart(2)}%  ${toHex(...hslToRgb(h, sa, l))}`).join('\n');
  }, ['palette'], '#3B82F6'),
  t('color-contrast', 'WCAG Contrast Ratio', 'Contrast ratio between two colors. Format: hex1::hex2', 'hex1::hex2', (s) => {
    const [a, b] = s.split('::').map((x) => parseHex(x)); if (!a || !b) return 'Format: hex1::hex2  (e.g. #000000::#FFFFFF)';
    const l1 = luminance(...a), l2 = luminance(...b);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const r = Math.round(ratio * 100) / 100;
    return `Contrast: ${r}:1\nNormal text AA (4.5): ${r >= 4.5 ? 'PASS' : 'FAIL'}\nNormal text AAA (7): ${r >= 7 ? 'PASS' : 'FAIL'}\nLarge text AA (3): ${r >= 3 ? 'PASS' : 'FAIL'}`;
  }, ['accessibility'], '#1F2937::#F9FAFB'),
  t('color-readable', 'Best Text Color', 'Pick black or white text for a background.', 'a hex background color', (s) => {
    const c = parseHex(s); if (!c) return 'Enter a hex color.';
    const lum = luminance(...c);
    const white = (1.05) / (lum + 0.05), black = (lum + 0.05) / 0.05;
    return white > black ? `Use WHITE text (#FFFFFF), contrast ${Math.round(white * 100) / 100}:1` : `Use BLACK text (#000000), contrast ${Math.round(black * 100) / 100}:1`;
  }, ['accessibility'], '#3B82F6'),
  t('color-blend', 'Blend Two Colors', 'Mix two colors 50/50. Format: hex1::hex2', 'hex1::hex2', (s) => {
    const [a, b] = s.split('::').map((x) => parseHex(x)); if (!a || !b) return 'Format: hex1::hex2';
    return `Midpoint: ${toHex((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)}`;
  }, ['palette'], '#FF0000::#0000FF'),
  t('color-lighten', 'Lighten / Darken', 'Shift lightness by percent. Format: hex::±percent', 'hex::amount', (s) => {
    const [hex, amt] = s.split('::'); const c = parseHex(hex || ''); const d = parseInt(amt, 10);
    if (!c || isNaN(d)) return 'Format: hex::±percent  (e.g. #3B82F6::-20)';
    const [h, sa, l] = rgbToHsl(...c);
    return toHex(...hslToRgb(h, sa, Math.max(0, Math.min(100, l + d))));
  }, ['palette'], '#3B82F6::-20'),
  t('color-grayscale', 'Grayscale', 'Convert a color to its luminance-based gray.', 'a hex color', (s) => {
    const c = parseHex(s); if (!c) return 'Enter a hex color.';
    const g = Math.round(0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]);
    return `${toHex(g, g, g)}  (gray ${g})`;
  }, ['convert'], '#3B82F6'),
  t('color-random', 'Random Color', 'Generate a random hex color with its RGB/HSL.', 'press run (input ignored)', () => {
    const r = Math.floor(Math.random() * 256), g = Math.floor(Math.random() * 256), b = Math.floor(Math.random() * 256);
    const [h, s, l] = rgbToHsl(r, g, b);
    return `${toHex(r, g, b)}\nrgb(${r}, ${g}, ${b})\nhsl(${h}, ${s}%, ${l}%)`;
  }, ['generate']),
  t('color-blind-sim', 'Color-Blindness Simulator', 'How hex colors appear with protanopia/deuteranopia/tritanopia (Viénot approximation).', 'hex colors space/comma-sep', (s) => {
    const colors = (s.match(/#?[0-9a-fA-F]{6}|#?[0-9a-fA-F]{3}\b/g) ?? []).map(parseHex).filter(Boolean) as [number, number, number][];
    if (!colors.length) return 'Enter one or more hex colors, e.g. #3B82F6 #EF4444';
    const MATS: [string, number[]][] = [
      ['protanopia  ', [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758]],
      ['deuteranopia', [0.625, 0.375, 0, 0.7, 0.3, 0, 0, 0.3, 0.7]],
      ['tritanopia  ', [0.95, 0.05, 0, 0, 0.433, 0.567, 0, 0.475, 0.525]],
    ];
    const apply = (m: number[], [r, g, b]: [number, number, number]) => toHex(
      m[0] * r + m[1] * g + m[2] * b,
      m[3] * r + m[4] * g + m[5] * b,
      m[6] * r + m[7] * g + m[8] * b,
    );
    return colors.map((c) =>
      [`${toHex(...c)} appears as:`, ...MATS.map(([name, m]) => `  ${name} ${apply(m, c)}`)].join('\n')
    ).join('\n\n');
  }, ['accessibility', 'colorblind'], '#3B82F6 #EF4444 #22C55E'),
];
