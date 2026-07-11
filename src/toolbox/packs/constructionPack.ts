/**
 * Home & DIY pack — paint, tile, concrete, lumber, stairs, fencing math.
 * Coverage figures are standard trade rules of thumb; always buy 10% spare.
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
  id, name, description, category: 'construction', tags: ['construction', 'diy', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const nums = (s: string): number[] => s.split('::').map((p) => parseFloat(p.trim()));
const bad = (hint: string) => `Format: ${hint}`;
const r1 = (n: number) => Math.round(n * 10) / 10;
const up = Math.ceil;

export const constructionPack: ToolboxTool[] = [
  t('dy-paint', 'Paint Coverage', 'Liters needed for walls. Format: wall area m²::coats[::coverage m²/L]', 'm²::coats[::m²/L]', (s) => {
    const [area, coats, cov] = nums(s); if (!area) return bad('42::2 or 42::2::11');
    const c = coats || 2, coverage = cov || 11;
    const liters = (area * c) / coverage;
    return `${area} m² × ${c} coat(s) @ ${coverage} m²/L → ${r1(liters)} L\nBuy: ${up(liters / 2.5)} × 2.5 L cans (or ${up(liters)} × 1 L)\n+10% spare: ${r1(liters * 1.1)} L`;
  }, ['paint'], '42::2'),
  t('dy-wall-area', 'Wall Area (minus openings)', 'Paintable area of a room. Format: perimeter m::height m[::doors::windows]', 'per::h[::doors::win]', (s) => {
    const [per, h, doors, windows] = nums(s); if (!per || !h) return bad('16::2.4::1::2');
    const gross = per * h;
    const openings = (doors || 0) * 1.9 + (windows || 0) * 1.4;
    return `Gross: ${r1(gross)} m²\nOpenings: −${r1(openings)} m² (${doors || 0} door(s) @1.9, ${windows || 0} window(s) @1.4)\nPaintable: ${r1(gross - openings)} m²`;
  }, ['walls', 'area'], '16::2.4::1::2'),
  t('dy-tile', 'Tile Count', 'Tiles for a floor/wall. Format: area m²::tile W cm::tile H cm[::grout gap mm]', 'm²::w::h[::gap]', (s) => {
    const [area, w, h, gap] = nums(s); if (!area || !w || !h) return bad('12::60::30 or 12::60::30::3');
    const g = (gap || 2) / 10;
    const per = ((w + g) / 100) * ((h + g) / 100);
    const count = up(area / per);
    return `${count} tiles (${r1(area / per)} exact)\nWith 10% cuts/breakage: ${up(count * 1.1)}\nPer m²: ${r1(1 / per)} tiles`;
  }, ['tile'], '12::60::30'),
  t('dy-flooring', 'Flooring Boxes', 'Boxes of laminate/vinyl needed. Format: room m²::m² per box', 'm²::box m²', (s) => {
    const [area, box] = nums(s); if (!area || !box) return bad('18::2.22');
    return `${up((area * 1.08) / box)} boxes (${r1(area)} m² + 8% waste = ${r1(area * 1.08)} m² @ ${box} m²/box)`;
  }, ['flooring'], '18::2.22'),
  t('dy-concrete', 'Concrete Volume', 'm³ + bags for a slab. Format: L m::W m::thickness cm', 'L::W::cm', (s) => {
    const [l, w, cm] = nums(s); if (!l || !w || !cm) return bad('4::3::10');
    const m3 = l * w * (cm / 100);
    return [
      `Volume: ${r1(m3 * 10) / 10} m³ (${r1(m3 * 1.05)} m³ with 5% spare)`,
      `~${up(m3 * 108)} × 25 kg dry-mix bags`,
      `Or ready-mix: order ${Math.max(0.5, Math.round(m3 * 2) / 2)} m³`,
    ].join('\n');
  }, ['concrete', 'slab'], '4::3::10'),
  t('dy-board-feet', 'Board Feet', 'Lumber volume. Format: thickness in::width in::length ft[::count]', 'T"::W"::L\'[::n]', (s) => {
    const [t2, w, l, n] = nums(s); if (!t2 || !w || !l) return bad('2::6::8::10 (2x6, 8ft, 10 pieces)');
    const bf = (t2 * w * l) / 12;
    const count = n || 1;
    return `${bf.toFixed(2)} board feet each${count > 1 ? ` × ${count} = ${(bf * count).toFixed(1)} bf total` : ''}`;
  }, ['lumber'], '2::6::8::10'),
  t('dy-stairs', 'Stair Rise & Run', 'Steps for a height with code-friendly rise. Format: total rise cm[::target rise cm]', 'rise cm[::step cm]', (s) => {
    const [total, target] = nums(s); if (!total) return bad('280 or 280::18');
    const ideal = target || 17.5;
    const steps = Math.round(total / ideal);
    const rise = total / steps;
    const run = 63 - 2 * rise; // 2R + G ≈ 63 cm comfort rule
    return [
      `${steps} risers of ${r1(rise)} cm`,
      `Suggested going (tread): ${r1(run)} cm (comfort rule 2R+G=63)`,
      rise >= 15 && rise <= 20 ? 'Rise within common code range (15–20 cm) ✓' : 'Rise OUTSIDE common code range (15–20 cm).',
      `Total run: ${r1((steps - 1) * run)} cm`,
    ].join('\n');
  }, ['stairs'], '280'),
  t('dy-roof-pitch', 'Roof Pitch', 'Angle and slope from rise/run. Format: rise::run (same unit) or x/12', 'rise::run', (s) => {
    let rise: number, run: number;
    const frac = s.trim().match(/^([\d.]+)\s*\/\s*12$/);
    if (frac) { rise = parseFloat(frac[1]); run = 12; }
    else { const p = nums(s); rise = p[0]; run = p[1]; }
    if (!rise || !run) return bad('6::12 or 6/12');
    const angle = Math.atan(rise / run) * (180 / Math.PI);
    const mult = Math.sqrt(rise * rise + run * run) / run;
    return `Pitch ${rise}/${run}: ${angle.toFixed(1)}°\nRafter length multiplier: ×${mult.toFixed(3)} of horizontal span\nSlope: ${r1((rise / run) * 100)}%`;
  }, ['roof', 'pitch'], '6/12'),
  t('dy-drywall', 'Drywall Sheets', 'Sheets for a wall/ceiling area. Format: area m²::sheet (1.2x2.4 default)', 'm²[::sheet m²]', (s) => {
    const [area, sheet] = nums(s); if (!area) return bad('40 or 40::2.88');
    const sh = sheet || 2.88;
    return `${up((area * 1.1) / sh)} sheets (${area} m² + 10% waste @ ${sh} m²/sheet)\nScrews: ~${up(area * 15)} · Joint compound: ~${r1(area * 0.9)} kg`;
  }, ['drywall'], '40'),
  t('dy-mulch', 'Mulch / Soil Volume', 'Cubic meters for a bed. Format: area m²::depth cm', 'm²::cm', (s) => {
    const [area, cm] = nums(s); if (!area || !cm) return bad('15::7');
    const m3 = area * (cm / 100);
    return `${r1(m3)} m³ (${up(m3 * 1000 / 50)} × 50 L bags)\n≈ ${r1(m3 * 1.308)} cubic yards`;
  }, ['garden', 'mulch'], '15::7'),
  t('dy-fence', 'Fence Posts & Panels', 'Posts/panels for a run. Format: length m::post spacing m', 'm::spacing', (s) => {
    const [len, gap] = nums(s); if (!len || !gap) return bad('30::2.4');
    const panels = up(len / gap);
    return `${panels} panel(s) of ≤${gap} m + ${panels + 1} posts\nConcrete: ~${panels + 1} bag(s) (one 25 kg bag per post)`;
  }, ['fence'], '30::2.4'),
  t('dy-bricks', 'Brick Count', 'Bricks per wall (standard 215×65 mm + 10 mm joint). Format: wall L m::H m[::layers 1|2]', 'L::H[::skins]', (s) => {
    const [l, h, skins] = nums(s); if (!l || !h) return bad('6::2 or 6::2::2');
    const per = 60; // bricks per m² single skin
    const count = up(l * h * per * (skins || 1));
    return `${count} bricks (${skins || 1} skin(s), 60/m²)\n+5% cuts: ${up(count * 1.05)}\nMortar: ~${r1(l * h * (skins || 1) * 0.03)} m³`;
  }, ['bricks'], '6::2'),
  t('dy-wallpaper', 'Wallpaper Rolls', 'Standard rolls (0.53×10.05 m) for a room. Format: perimeter m::height m[::pattern repeat cm]', 'per::h[::repeat]', (s) => {
    const [per, h, repeat] = nums(s); if (!per || !h) return bad('16::2.4 or 16::2.4::32');
    const dropH = h + (repeat ? repeat / 100 : 0.1);
    const dropsPerRoll = Math.floor(10.05 / dropH);
    if (dropsPerRoll < 1) return 'Wall too tall for a standard 10.05 m roll drop.';
    const drops = up(per / 0.53);
    return `${up(drops / dropsPerRoll)} rolls (${drops} drops, ${dropsPerRoll} per roll${repeat ? `, ${repeat} cm repeat` : ''})`;
  }, ['wallpaper'], '16::2.4'),
  t('dy-gravel', 'Gravel / Aggregate Weight', 'Tonnes for an area (bulk density 1.6 t/m³). Format: area m²::depth cm', 'm²::cm', (s) => {
    const [area, cm] = nums(s); if (!area || !cm) return bad('25::5');
    const m3 = area * (cm / 100);
    return `${r1(m3)} m³ ≈ ${r1(m3 * 1.6)} tonnes\nBulk bags (~0.85 t): ${up((m3 * 1.6) / 0.85)}`;
  }, ['gravel'], '25::5'),
  t('dy-insulation', 'Insulation R-Value Guide', 'Common targets and thickness for mineral wool (λ≈0.035). Input: target R or area m²::R', 'R or m²::R', (s) => {
    const p = nums(s);
    const rv = p.length > 1 ? p[1] : p[0];
    if (!rv) return bad('6 (R-value) or 60::6 (area::R)');
    const thick = rv * 0.035 * 1000;
    let out = `R${rv} needs ≈ ${Math.round(thick)} mm mineral wool (λ=0.035)\nTypical targets: walls R4–5 · roof R6–8 · floor R3–4`;
    if (p.length > 1) out += `\nFor ${p[0]} m²: ${r1(p[0] * thick / 1000)} m³ of material`;
    return out;
  }, ['insulation'], '60::6'),
];
