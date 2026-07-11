/**
 * Kitchen Calc pack — ingredient conversions, oven math, recipe scaling.
 * Densities are standard culinary references (US cup = 240 ml).
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
  id, name, description, category: 'cooking', tags: ['cooking', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

/** Grams per US cup for common ingredients. */
const DENSITY: Record<string, number> = {
  flour: 120, 'bread flour': 127, sugar: 200, 'brown sugar': 220, 'powdered sugar': 120,
  butter: 227, oil: 218, milk: 240, water: 240, honey: 340, rice: 185, oats: 90,
  'cocoa powder': 100, cornstarch: 128, salt: 288, yogurt: 245, cream: 238,
};

const bad = (hint: string) => `Format: ${hint}`;
const r1 = (n: number) => Math.round(n * 10) / 10;

export const cookingPack: ToolboxTool[] = [
  t('ck-cups-grams', 'Cups → Grams', 'Convert cups of an ingredient to grams. Format: cups::ingredient', 'cups::ingredient', (s) => {
    const p = s.split('::'); const cups = parseFloat(p[0]); const ing = (p[1] ?? '').trim().toLowerCase();
    if (!cups || !ing) return bad(`0.5::flour — known: ${Object.keys(DENSITY).join(', ')}`);
    const d = DENSITY[ing];
    if (!d) return `Unknown ingredient "${ing}". Known: ${Object.keys(DENSITY).join(', ')}`;
    return `${cups} cup(s) ${ing} = ${r1(cups * d)} g`;
  }, ['cups', 'grams'], '0.5::flour'),
  t('ck-grams-cups', 'Grams → Cups', 'Convert grams of an ingredient to cups. Format: grams::ingredient', 'g::ingredient', (s) => {
    const p = s.split('::'); const g = parseFloat(p[0]); const ing = (p[1] ?? '').trim().toLowerCase();
    if (!g || !ing) return bad('250::sugar');
    const d = DENSITY[ing];
    if (!d) return `Unknown ingredient "${ing}". Known: ${Object.keys(DENSITY).join(', ')}`;
    return `${g} g ${ing} = ${(g / d).toFixed(2)} cup(s) (${r1((g / d) * 16)} tbsp)`;
  }, ['grams', 'cups'], '250::sugar'),
  t('ck-volume', 'Kitchen Volume Converter', 'tsp/tbsp/cup/ml/floz any direction. Input like 3tbsp, 250ml, 0.5cup', 'value+unit', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*(tsp|tbsp|cup|cups|ml|l|floz|oz)$/);
    if (!m) return bad('3tbsp, 250ml, 0.5cup, 8floz');
    const toMl: Record<string, number> = { tsp: 4.93, tbsp: 14.79, cup: 240, cups: 240, ml: 1, l: 1000, floz: 29.57, oz: 29.57 };
    const ml = parseFloat(m[1]) * toMl[m[2]];
    return `${m[1]} ${m[2]} =\n${r1(ml)} ml · ${(ml / 240).toFixed(2)} cups · ${r1(ml / 14.79)} tbsp · ${r1(ml / 4.93)} tsp · ${(ml / 29.57).toFixed(1)} fl oz`;
  }, ['volume'], '3tbsp'),
  t('ck-oven', 'Oven Temperature', '°F ↔ °C with gas mark and fan-oven adjustment. Input like 350f or 180c', 'temp+f|c', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*°?\s*(f|c)$/); if (!m) return bad('350f or 180c');
    const v = parseFloat(m[1]);
    const c = m[2] === 'f' ? ((v - 32) * 5) / 9 : v;
    const f = m[2] === 'c' ? (v * 9) / 5 + 32 : v;
    const gas = Math.max(0.25, Math.round(((f - 250) / 25 + 1) * 2) / 2);
    return `${Math.round(f)} °F = ${Math.round(c)} °C\nGas mark ≈ ${gas <= 0.5 ? '¼–½' : gas}\nFan/convection: reduce ~20 °C → ${Math.round(c - 20)} °C`;
  }, ['oven', 'temperature'], '350f'),
  t('ck-scale-recipe', 'Recipe Scaler', 'Multiply every number in a recipe. Format: factor::recipe text', 'factor::text', (s) => {
    const idx = s.indexOf('::'); if (idx < 0) return bad('1.5::2 cups flour\\n3 eggs');
    const factor = parseFloat(s.slice(0, idx));
    if (!factor || factor <= 0) return 'Factor must be a positive number.';
    const scaled = s.slice(idx + 2).replace(/(\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)/g, (m) => {
      let v: number;
      if (m.includes('/')) { const [a, b] = m.split('/').map((x) => parseFloat(x)); v = a / b; }
      else v = parseFloat(m.replace(',', '.'));
      const out = v * factor;
      return Number.isInteger(out) ? String(out) : out.toFixed(2).replace(/\.?0+$/, '');
    });
    return scaled;
  }, ['scale', 'recipe'], '1.5::2 cups flour\n3 eggs\n0.5 tsp salt'),
  t('ck-servings', 'Servings Converter', 'Rescale from one serving count to another. Format: from::to::recipe', 'from::to::text', (s) => {
    const p = s.split('::'); if (p.length < 3) return bad('4::6::200 g pasta\\n2 eggs');
    const from = parseFloat(p[0]), to = parseFloat(p[1]);
    if (!from || !to) return bad('4::6::recipe text');
    const factor = to / from;
    const body = p.slice(2).join('::');
    const scaled = body.replace(/\d+(?:[.,]\d+)?/g, (m) => {
      const out = parseFloat(m.replace(',', '.')) * factor;
      return Number.isInteger(out) ? String(out) : out.toFixed(2).replace(/\.?0+$/, '');
    });
    return `Scaled ${from} → ${to} servings (×${factor.toFixed(2)}):\n${scaled}`;
  }, ['servings'], '4::6::200 g pasta\n2 eggs'),
  t('ck-meat-temp', 'Safe Meat Temperatures', 'USDA internal temps for a meat. Input: chicken, beef, pork, fish, turkey, lamb, ground', 'meat name', (s) => {
    const temps: Record<string, string> = {
      chicken: '74 °C / 165 °F (whole or pieces)',
      turkey: '74 °C / 165 °F',
      ground: '71 °C / 160 °F (any ground meat)',
      pork: '63 °C / 145 °F + 3 min rest',
      beef: '63 °C / 145 °F medium-rare-safe + rest (steak/roast)',
      lamb: '63 °C / 145 °F + rest',
      fish: '63 °C / 145 °F or until opaque',
      duck: '74 °C / 165 °F',
      veal: '63 °C / 145 °F + rest',
    };
    const key = s.trim().toLowerCase();
    if (!key) return Object.entries(temps).map(([k, v]) => `${k}: ${v}`).join('\n');
    const hit = temps[key] ?? Object.entries(temps).find(([k]) => key.includes(k))?.[1];
    return hit ? `${key}: ${hit}` : `Unknown meat. Known: ${Object.keys(temps).join(', ')}`;
  }, ['meat', 'safety'], 'chicken'),
  t('ck-roast-time', 'Roast Timing', 'Rough roasting time by weight. Format: meat::kg (chicken, beef, pork, turkey, lamb)', 'meat::kg', (s) => {
    const p = s.split('::'); const kg = parseFloat(p[1]);
    const perKg: Record<string, [number, number, string]> = {
      chicken: [45, 20, '200 °C'], turkey: [40, 20, '180 °C'], beef: [40, 20, '190 °C (medium)'],
      pork: [55, 25, '180 °C'], lamb: [50, 25, '180 °C'],
    };
    const key = (p[0] ?? '').trim().toLowerCase();
    const row = perKg[key];
    if (!row || !kg) return bad(`chicken::1.8 — known: ${Object.keys(perKg).join(', ')}`);
    const mins = row[0] * kg + row[1];
    return `${key} ${kg} kg @ ${row[2]}: ≈ ${Math.floor(mins / 60)} h ${Math.round(mins % 60)} min\nAlways confirm with a meat thermometer.`;
  }, ['roast'], 'chicken::1.8'),
  t('ck-pan-size', 'Baking Pan Equivalents', 'Area-equivalent pan swaps. Input: pan size like 9x13, 8 round, 9 round, 8x8', 'pan size', (s) => {
    const areas: Record<string, number> = { '8x8': 64, '9x9': 81, '9x13': 117, '8 round': 50, '9 round': 64, '10 round': 79, '9x5 loaf': 45, 'bundt': 72, '12 muffins': 53 };
    const key = s.trim().toLowerCase();
    const area = areas[key];
    if (!area) return `Known pans: ${Object.keys(areas).join(', ')}`;
    const matches = Object.entries(areas)
      .filter(([k]) => k !== key)
      .map(([k, a]) => ({ k, diff: Math.abs(a - area) / area }))
      .filter((x) => x.diff <= 0.15)
      .map((x) => x.k);
    return `${key} ≈ ${area} sq in\nClose swaps (±15%): ${matches.length ? matches.join(', ') : 'none — adjust bake time'}`;
  }, ['pan', 'baking'], '9x13'),
  t('ck-coffee', 'Coffee Ratio', 'Grams of coffee for a brew. Format: ml water[::ratio like 16]', 'ml[::ratio]', (s) => {
    const p = s.split('::'); const ml = parseFloat(p[0]); const ratio = parseFloat(p[1]) || 16;
    if (!ml) return bad('500 or 500::15 (1:15 stronger)');
    return `${ml} ml water @ 1:${ratio} → ${r1(ml / ratio)} g coffee\nStrong (1:14): ${r1(ml / 14)} g · Mild (1:18): ${r1(ml / 18)} g`;
  }, ['coffee'], '500::16'),
  t('ck-bakers-pct', "Baker's Percentage", 'Hydration % from flour and water grams. Format: flour g::water g[::salt g::yeast g]', 'flour::water[::salt::yeast]', (s) => {
    const p = s.split('::').map(Number); if (!p[0] || !p[1]) return bad('500::350::10::5');
    const pct = (x: number) => ((x / p[0]) * 100).toFixed(1) + '%';
    let out = `Hydration: ${pct(p[1])}`;
    if (p[2]) out += `\nSalt: ${pct(p[2])}`;
    if (p[3]) out += `\nYeast: ${pct(p[3])}`;
    const h = (p[1] / p[0]) * 100;
    out += `\n${h < 60 ? 'Stiff dough (bagels, pretzels)' : h < 70 ? 'Standard bread dough' : h < 80 ? 'Rustic/artisan range' : 'High hydration (ciabatta, focaccia)'}`;
    return out;
  }, ['bread', 'hydration'], '500::350::10::5'),
  t('ck-yeast', 'Yeast Conversion', 'Fresh ↔ active dry ↔ instant. Input like 20g fresh, 7g instant, 9g dry', 'amount+type', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*g?\s*(fresh|dry|active|instant)/);
    if (!m) return bad('20g fresh, 7g instant, 9g dry');
    const v = parseFloat(m[1]);
    // ratios: fresh 1 : active-dry 0.4 : instant 0.33
    const fresh = m[2] === 'fresh' ? v : m[2] === 'instant' ? v * 3 : v * 2.5;
    return `Fresh: ${r1(fresh)} g\nActive dry: ${r1(fresh * 0.4)} g\nInstant: ${r1(fresh * 0.33)} g`;
  }, ['yeast', 'baking'], '20g fresh'),
  t('ck-egg-sub', 'Egg Substitutes', 'Per-egg replacements for baking. Input ignored.', 'press run', () => [
    'Per 1 egg:',
    '• 1 tbsp ground flax + 3 tbsp water (rest 5 min)',
    '• 1 tbsp chia + 3 tbsp water',
    '• ¼ cup (60 g) applesauce',
    '• ¼ cup mashed banana',
    '• ¼ cup (60 g) silken tofu, blended',
    '• 3 tbsp aquafaba (chickpea liquid)',
    '• 1 tsp baking soda + 1 tbsp vinegar (for lift)',
  ].join('\n'), ['eggs', 'substitute']),
  t('ck-brine', 'Basic Brine Calculator', 'Salt for a % brine. Format: liters water::percent (5–6% typical)', 'L::%', (s) => {
    const p = s.split('::').map(Number); if (!p[0]) return bad('2::5');
    const pct = p[1] || 5;
    return `${p[0]} L water @ ${pct}% brine → ${r1(p[0] * 1000 * (pct / 100))} g salt\nTypical times: chicken pieces 1–2 h · whole bird 8–12 h · pork chops 2–4 h`;
  }, ['brine'], '2::5'),
];
