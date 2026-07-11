/**
 * Science Lab pack — physics, chemistry, astronomy calculators.
 * Standard textbook formulas, SI units, fully offline.
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
  id, name, description, category: 'science', tags: ['science', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const nums = (s: string): number[] => s.split('::').map((p) => parseFloat(p.trim()));
const bad = (hint: string) => `Format: ${hint}`;
const sig = (n: number, d = 4) => Number(n.toPrecision(d)).toString();

const G = 9.80665; // m/s²
const C = 299792458; // m/s

/** Atomic weights of the 60 most common elements. */
const ELEMENTS: Record<string, number> = {
  H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999,
  F: 18.998, Ne: 20.18, Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, P: 30.974, S: 32.06,
  Cl: 35.45, Ar: 39.948, K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.63,
  As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224,
  Mo: 95.95, Ag: 107.87, Cd: 112.41, Sn: 118.71, Sb: 121.76, I: 126.9, Xe: 131.29, Cs: 132.91,
  Ba: 137.33, W: 183.84, Pt: 195.08, Au: 196.97, Hg: 200.59, Pb: 207.2, Bi: 208.98, U: 238.03,
  Rn: 222, Ra: 226, Th: 232.04, Pu: 244,
};

/** Recursive chemical-formula parser: handles parentheses and counts (e.g. Ca(OH)2, C6H12O6). */
function molarMass(formula: string): { mass: number; parts: string[] } | string {
  let i = 0;
  const parse = (depth: number): number | string => {
    let total = 0;
    while (i < formula.length) {
      const ch = formula[i];
      if (ch === '(') {
        i++;
        const inner = parse(depth + 1);
        if (typeof inner === 'string') return inner;
        let cnt = '';
        while (i < formula.length && /\d/.test(formula[i])) cnt += formula[i++];
        total += inner * (parseInt(cnt) || 1);
      } else if (ch === ')') {
        if (depth === 0) return `Unmatched ")" at position ${i}`;
        i++;
        return total;
      } else if (/[A-Z]/.test(ch)) {
        let sym = ch; i++;
        if (i < formula.length && /[a-z]/.test(formula[i])) sym += formula[i++];
        const w = ELEMENTS[sym];
        if (w === undefined) return `Unknown element: ${sym}`;
        let cnt = '';
        while (i < formula.length && /\d/.test(formula[i])) cnt += formula[i++];
        const n = parseInt(cnt) || 1;
        total += w * n;
        parts.push(`${sym}×${n}`);
      } else {
        return `Unexpected character "${ch}" at position ${i}`;
      }
    }
    return total;
  };
  const parts: string[] = [];
  const clean = formula.replace(/\s/g, '');
  if (!clean) return 'Enter a chemical formula, e.g. H2O or Ca(OH)2';
  const result = parse(0);
  return typeof result === 'string' ? result : { mass: result, parts };
}

export const sciencePack: ToolboxTool[] = [
  t('sci-molar-mass', 'Molar Mass', 'Molecular weight of a chemical formula (handles parentheses). Input: formula', 'chemical formula', (s) => {
    const r = molarMass(s);
    if (typeof r === 'string') return r;
    return `${s.trim()} = ${r.mass.toFixed(3)} g/mol\n(${r.parts.join(', ')})`;
  }, ['chemistry', 'molar'], 'C6H12O6'),
  t('sci-ohms-law', "Ohm's Law Solver", 'Give any two of V, I, R (e.g. v=12::i=0.5) and get the rest + power.', 'v=?::i=?::r=?', (s) => {
    const vals: Record<string, number> = {};
    s.toLowerCase().split('::').forEach((p) => { const m = p.trim().match(/^([vir])\s*=\s*([\d.eE+-]+)$/); if (m) vals[m[1]] = parseFloat(m[2]); });
    let { v, i, r } = vals;
    if ([v, i, r].filter((x) => x !== undefined).length < 2) return bad('two of v=12::i=0.5::r=24');
    if (v === undefined) v = i! * r!;
    else if (i === undefined) i = v / r!;
    else if (r === undefined) r = v / i;
    return `V = ${sig(v)} V\nI = ${sig(i!)} A\nR = ${sig(r!)} Ω\nP = ${sig(v * i!)} W`;
  }, ['physics', 'ohm', 'electricity'], 'v=12::i=0.5'),
  t('sci-kinetic', 'Kinetic Energy', 'KE = ½mv². Format: mass kg::velocity m/s', 'kg::m/s', (s) => {
    const [m, v] = nums(s); if (isNaN(m) || isNaN(v)) return bad('80::10');
    const ke = 0.5 * m * v * v;
    return `KE = ${sig(ke)} J${ke > 4184 ? ` (${sig(ke / 4184)} food-kcal)` : ''}`;
  }, ['physics', 'energy'], '80::10'),
  t('sci-potential', 'Potential Energy', 'PE = mgh. Format: mass kg::height m', 'kg::m', (s) => {
    const [m, h] = nums(s); if (isNaN(m) || isNaN(h)) return bad('80::10');
    return `PE = ${sig(m * G * h)} J (g = 9.807 m/s²)`;
  }, ['physics', 'energy'], '80::10'),
  t('sci-force', 'Force (F = ma)', 'Newtons from mass and acceleration. Format: kg::m/s²', 'kg::m/s²', (s) => {
    const [m, a] = nums(s); if (isNaN(m) || isNaN(a)) return bad('1000::3');
    const f = m * a;
    return `F = ${sig(f)} N (${sig(f / G)} kgf, ${sig(f * 0.2248)} lbf)`;
  }, ['physics', 'force'], '1000::3'),
  t('sci-momentum', 'Momentum (p = mv)', 'Linear momentum. Format: mass kg::velocity m/s', 'kg::m/s', (s) => {
    const [m, v] = nums(s); if (isNaN(m) || isNaN(v)) return bad('1500::27.8');
    return `p = ${sig(m * v)} kg·m/s`;
  }, ['physics'], '1500::27.8'),
  t('sci-freefall', 'Free-Fall Time & Impact', 'Drop time and impact speed from a height (vacuum). Input: height m', 'height m', (s) => {
    const h = parseFloat(s); if (isNaN(h) || h < 0) return 'Enter a drop height in meters.';
    const t2 = Math.sqrt((2 * h) / G);
    const v = G * t2;
    return `Fall time: ${t2.toFixed(2)} s\nImpact: ${v.toFixed(1)} m/s (${(v * 3.6).toFixed(1)} km/h)`;
  }, ['physics', 'gravity'], '45'),
  t('sci-projectile', 'Projectile Range', 'Ideal range/height/time from speed + angle. Format: m/s::degrees', 'm/s::deg', (s) => {
    const [v, a] = nums(s); if (isNaN(v) || isNaN(a)) return bad('30::45');
    const th = (a * Math.PI) / 180;
    return `Range: ${((v * v * Math.sin(2 * th)) / G).toFixed(1)} m\nMax height: ${((v * Math.sin(th)) ** 2 / (2 * G)).toFixed(1)} m\nFlight time: ${((2 * v * Math.sin(th)) / G).toFixed(2)} s`;
  }, ['physics', 'projectile'], '30::45'),
  t('sci-wavelength', 'Frequency ↔ Wavelength', 'λ = c/f for EM waves. Input like 100MHz or 3m or 2.4GHz', 'freq or wavelength', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*(ghz|mhz|khz|hz|km|cm|mm|nm|m)$/);
    if (!m) return bad('2.4GHz, 100MHz, 3m, 500nm');
    const v = parseFloat(m[1]);
    const toHz: Record<string, number> = { hz: 1, khz: 1e3, mhz: 1e6, ghz: 1e9 };
    const toM: Record<string, number> = { m: 1, km: 1e3, cm: 1e-2, mm: 1e-3, nm: 1e-9 };
    if (m[2] in toHz) { const l = C / (v * toHz[m[2]]); return `λ = ${sig(l)} m${l < 1e-6 ? ` (${sig(l * 1e9)} nm)` : ''}`; }
    const f = C / (v * toM[m[2]]);
    return `f = ${f >= 1e9 ? sig(f / 1e9) + ' GHz' : f >= 1e6 ? sig(f / 1e6) + ' MHz' : sig(f) + ' Hz'}`;
  }, ['physics', 'waves'], '2.4GHz'),
  t('sci-photon', 'Photon Energy', 'E = hc/λ from wavelength in nm. Input: nm', 'wavelength nm', (s) => {
    const nm = parseFloat(s); if (!nm) return 'Enter wavelength in nm (visible: 380–750).';
    const eJ = (6.62607015e-34 * C) / (nm * 1e-9);
    const band = nm < 380 ? 'ultraviolet' : nm <= 450 ? 'violet-blue' : nm <= 495 ? 'blue-cyan' : nm <= 570 ? 'green' : nm <= 590 ? 'yellow' : nm <= 620 ? 'orange' : nm <= 750 ? 'red' : 'infrared';
    return `E = ${sig(eJ)} J = ${sig(eJ / 1.602176634e-19)} eV (${band})`;
  }, ['physics', 'quantum'], '532'),
  t('sci-speed-sound', 'Speed of Sound', 'In air at a temperature: v = 331.3 + 0.606T. Input: °C', 'temp °C', (s) => {
    const c = parseFloat(s); if (isNaN(c)) return 'Enter air temperature in °C.';
    const v = 331.3 + 0.606 * c;
    return `${v.toFixed(1)} m/s (${(v * 3.6).toFixed(0)} km/h) at ${c} °C\n1 km of thunder delay ≈ ${(1000 / v).toFixed(1)} s`;
  }, ['physics', 'sound'], '20'),
  t('sci-db-combine', 'Combine Decibels', 'Sum of incoherent sound sources. Input: dB values space-separated', 'dB list', (s) => {
    const vals = s.split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    if (!vals.length) return 'Enter dB levels, e.g. 90 90 85';
    const total = 10 * Math.log10(vals.reduce((a, v) => a + 10 ** (v / 10), 0));
    return `Combined: ${total.toFixed(1)} dB (from ${vals.length} sources)`;
  }, ['sound', 'db'], '90 90 85'),
  t('sci-ideal-gas', 'Ideal Gas Law', 'Solve PV = nRT for the missing one. Format: p=kPa::v=L::n=mol::t=K (leave one out)', 'p::v::n::t (omit one)', (s) => {
    const vals: Record<string, number> = {};
    s.toLowerCase().split('::').forEach((p2) => { const m = p2.trim().match(/^([pvnt])\s*=\s*([\d.eE+-]+)$/); if (m) vals[m[1]] = parseFloat(m[2]); });
    const R2 = 8.314; // L·kPa/(mol·K)
    const { p, v, n, t: tk } = vals;
    const have = [p, v, n, tk].filter((x) => x !== undefined).length;
    if (have < 3) return bad('three of p=101.3::v=22.4::n=1::t=273 (kPa, L, mol, K)');
    if (p === undefined) return `P = ${sig((n! * R2 * tk!) / v!)} kPa`;
    if (v === undefined) return `V = ${sig((n! * R2 * tk!) / p)} L`;
    if (n === undefined) return `n = ${sig((p * v!) / (R2 * tk!))} mol`;
    return `T = ${sig((p * v!) / (n * R2))} K`;
  }, ['chemistry', 'gas'], 'p=101.3::n=1::t=273'),
  t('sci-ph', 'pH ↔ Concentration', 'pH from [H+] mol/L, or [H+] from pH. Input: ph=3.5 or h=0.0001', 'ph=? or h=?', (s) => {
    const m = s.trim().toLowerCase().match(/^(ph|h)\s*=\s*([\d.eE+-]+)$/); if (!m) return bad('ph=3.5 or h=1e-4');
    if (m[1] === 'ph') { const ph = parseFloat(m[2]); return `[H+] = ${sig(10 ** -ph)} mol/L (${ph < 7 ? 'acidic' : ph > 7 ? 'basic' : 'neutral'})`; }
    const h = parseFloat(m[2]); const ph = -Math.log10(h);
    return `pH = ${ph.toFixed(2)} (${ph < 7 ? 'acidic' : ph > 7 ? 'basic' : 'neutral'})`;
  }, ['chemistry', 'ph'], 'ph=3.5'),
  t('sci-half-life', 'Half-Life Decay', 'Fraction remaining after time. Format: half-life::elapsed (same unit)', 't½::elapsed', (s) => {
    const [hl, el] = nums(s); if (!hl || isNaN(el)) return bad('5730::10000 (C-14 years)');
    const frac = Math.pow(0.5, el / hl);
    return `Remaining: ${(frac * 100).toPrecision(4)}% after ${el / hl} half-lives`;
  }, ['physics', 'decay'], '5730::10000'),
  t('sci-c14-age', 'Radiocarbon Age', 'Age from % C-14 remaining (t½ = 5730 y). Input: percent', '% remaining', (s) => {
    const pct = parseFloat(s); if (!pct || pct <= 0 || pct > 100) return 'Enter % of C-14 remaining (0–100).';
    return `Estimated age: ${Math.round(-5730 * Math.log2(pct / 100)).toLocaleString()} years`;
  }, ['dating', 'carbon'], '25'),
  t('sci-lightyear', 'Light Travel Converter', 'ly / AU / km / light-minutes. Input like 4.2ly, 1AU, 150000000km', 'value+unit', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*(ly|au|km|lm)$/); if (!m) return bad('4.2ly, 1au, 149597870km, 8.3lm');
    const v = parseFloat(m[1]);
    const KM_LY = 9.4607e12, KM_AU = 1.495978707e8, KM_LM = C * 60 / 1000;
    const km = m[2] === 'ly' ? v * KM_LY : m[2] === 'au' ? v * KM_AU : m[2] === 'lm' ? v * KM_LM : v;
    return `${sig(km)} km\n= ${sig(km / KM_AU)} AU\n= ${sig(km / KM_LY)} light-years\n= ${sig(km / KM_LM)} light-minutes`;
  }, ['astronomy', 'space'], '4.2ly'),
  t('sci-planet-weight', 'Weight on Other Worlds', 'Your weight across the solar system. Input: kg on Earth', 'kg', (s) => {
    const kg = parseFloat(s); if (!kg) return 'Enter your Earth weight in kg.';
    const g: [string, number][] = [['Moon', 0.166], ['Mars', 0.379], ['Venus', 0.907], ['Mercury', 0.378], ['Jupiter', 2.36], ['Saturn', 0.916], ['Uranus', 0.889], ['Neptune', 1.12], ['Pluto', 0.062], ['Sun', 27.07]];
    return g.map(([n, f]) => `${n.padEnd(8)} ${(kg * f).toFixed(1)} kg-equivalent`).join('\n');
  }, ['astronomy', 'gravity'], '70'),
  t('sci-escape-velocity', 'Escape Velocity', 'v = √(2GM/r). Format: mass kg::radius m (Earth: 5.97e24::6.371e6)', 'M kg::r m', (s) => {
    const [m, r] = nums(s); if (!m || !r) return bad('5.97e24::6.371e6');
    const v = Math.sqrt((2 * 6.674e-11 * m) / r);
    return `Escape velocity: ${(v / 1000).toFixed(2)} km/s`;
  }, ['astronomy'], '5.97e24::6.371e6'),
  t('sci-orbital-period', 'Orbital Period (Kepler)', 'Period of a circular orbit. Format: central mass kg::orbit radius m', 'M kg::r m', (s) => {
    const [m, r] = nums(s); if (!m || !r) return bad('5.97e24::6.771e6 (ISS ~400 km)');
    const t2 = 2 * Math.PI * Math.sqrt(r ** 3 / (6.674e-11 * m));
    return `Period: ${(t2 / 60).toFixed(1)} min (${(t2 / 3600).toFixed(2)} h)`;
  }, ['astronomy', 'orbit'], '5.97e24::6.771e6'),
  t('sci-dilution', 'Solution Dilution (C1V1)', 'C1V1 = C2V2 — find needed stock volume. Format: C1::C2::V2', 'stock::target::final vol', (s) => {
    const [c1, c2, v2] = nums(s); if (!c1 || !c2 || !v2) return bad('10::2::100 (10x stock → 2x in 100 ml)');
    if (c2 > c1) return 'Target concentration exceeds stock — cannot dilute upward.';
    const v1 = (c2 * v2) / c1;
    return `Take ${sig(v1)} of stock + ${sig(v2 - v1)} of diluent → ${v2} at ${c2}`;
  }, ['chemistry', 'lab'], '10::2::100'),
  t('sci-density', 'Density Solver', 'ρ = m/V — give two of m (g), v (mL), d (g/mL).', 'm=?::v=?::d=?', (s) => {
    const vals: Record<string, number> = {};
    s.toLowerCase().split('::').forEach((p) => { const m = p.trim().match(/^([mvd])\s*=\s*([\d.eE+-]+)$/); if (m) vals[m[1]] = parseFloat(m[2]); });
    const { m, v, d } = vals;
    if ([m, v, d].filter((x) => x !== undefined).length < 2) return bad('two of m=100::v=50::d=2');
    if (d === undefined) return `ρ = ${sig(m! / v!)} g/mL`;
    if (m === undefined) return `m = ${sig(d * v!)} g`;
    return `V = ${sig(m / d)} mL`;
  }, ['physics', 'density'], 'm=100::v=50'),
];
