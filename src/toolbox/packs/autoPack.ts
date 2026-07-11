/**
 * Automotive pack — fuel economy, tire math, trip costs, power figures.
 * Standard conversions; tire decode follows ISO metric sizing.
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
  id, name, description, category: 'auto', tags: ['auto', 'car', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const nums = (s: string): number[] => s.split('::').map((p) => parseFloat(p.trim()));
const bad = (hint: string) => `Format: ${hint}`;
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Parse "225/45R17" → { width, aspect, rim } or null. */
const parseTire = (s: string): { width: number; aspect: number; rim: number } | null => {
  const m = s.trim().toUpperCase().match(/^(\d{3})\/(\d{2})\s*Z?R(\d{2})$/);
  return m ? { width: +m[1], aspect: +m[2], rim: +m[3] } : null;
};

const tireDiameterMm = (t2: { width: number; aspect: number; rim: number }): number =>
  t2.rim * 25.4 + 2 * (t2.width * t2.aspect / 100);

export const autoPack: ToolboxTool[] = [
  t('au-mpg-l100', 'MPG ↔ L/100km', 'Fuel economy both ways. Input like 32mpg or 7.4l', 'value+mpg|l', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*(mpg|l)/); if (!m) return bad('32mpg or 7.4l');
    const v = parseFloat(m[1]);
    if (m[2] === 'mpg') return `${v} MPG (US) = ${r2(235.215 / v)} L/100km = ${r2(v * 1.20095)} MPG (UK)`;
    return `${v} L/100km = ${r2(235.215 / v)} MPG (US) = ${r2(282.481 / v)} MPG (UK) = ${r2(100 / v)} km/L`;
  }, ['fuel', 'mpg'], '7.4l'),
  t('au-kml', 'km/L ↔ L/100km', 'Convert between km-per-liter and liters-per-100km. Input like 14kml or 7l', 'value+kml|l', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*(kml|l)/); if (!m) return bad('14kml or 7l');
    const v = parseFloat(m[1]);
    return m[2] === 'kml'
      ? `${v} km/L = ${r2(100 / v)} L/100km = ${r2(v * 2.35215)} MPG (US)`
      : `${v} L/100km = ${r2(100 / v)} km/L`;
  }, ['fuel'], '14kml'),
  t('au-trip-cost', 'Trip Fuel Cost', 'Cost of a drive. Format: distance km::L/100km::price per liter', 'km::L/100km::price', (s) => {
    const [km, cons, price] = nums(s); if (!km || !cons || !price) return bad('450::7.5::1.85');
    const liters = (km / 100) * cons;
    return `${km} km @ ${cons} L/100km → ${r1(liters)} L\nFuel cost: ${r2(liters * price)} (at ${price}/L)\nPer km: ${r2((liters * price) / km)}`;
  }, ['trip', 'fuel'], '450::7.5::1.85'),
  t('au-fuel-split', 'Fuel Cost Split', 'Share a trip cost between people. Format: total cost::people[::driver share %]', 'cost::people[::driver%]', (s) => {
    const [cost, people, dPct] = nums(s); if (!cost || !people) return bad('83.25::4 or 83.25::4::0 (driver rides free)');
    if (dPct !== undefined && !isNaN(dPct)) {
      const driver = cost * (dPct / 100);
      const rest = (cost - driver) / (people - 1);
      return `Driver pays ${r2(driver)} · each passenger pays ${r2(rest)} (${people - 1} passengers)`;
    }
    return `Each of ${people} pays ${r2(cost / people)}`;
  }, ['split'], '83.25::4'),
  t('au-tire-decode', 'Tire Size Decode', 'Decode 225/45R17 → dimensions. Input: tire size', 'e.g. 225/45R17', (s) => {
    const t2 = parseTire(s); if (!t2) return bad('225/45R17');
    const d = tireDiameterMm(t2);
    return [
      `Width: ${t2.width} mm`,
      `Sidewall: ${r1(t2.width * t2.aspect / 100)} mm (${t2.aspect}% aspect)`,
      `Rim: ${t2.rim}" (${r1(t2.rim * 25.4)} mm)`,
      `Overall diameter: ${r1(d)} mm (${r2(d / 25.4)}")`,
      `Circumference: ${r1(Math.PI * d)} mm · ${Math.round(1e6 / (Math.PI * d))} revs/km`,
    ].join('\n');
  }, ['tire'], '225/45R17'),
  t('au-tire-compare', 'Tire Size Compare', 'Speedometer error between two sizes. Format: old::new', 'size::size', (s) => {
    const p = s.split('::').map(parseTire); if (!p[0] || !p[1]) return bad('225/45R17::235/40R18');
    const [d1, d2] = [tireDiameterMm(p[0]), tireDiameterMm(p[1])];
    const diff = ((d2 - d1) / d1) * 100;
    const at100 = 100 * (d2 / d1);
    return [
      `Old: ${r1(d1)} mm · New: ${r1(d2)} mm (${diff >= 0 ? '+' : ''}${r2(diff)}%)`,
      `Speedo reads 100 → true speed ${r1(at100)} km/h`,
      Math.abs(diff) <= 3 ? 'Within the usual ±3% guideline ✓' : 'Outside ±3% — speedo/odometer will be noticeably off.',
    ].join('\n');
  }, ['tire', 'speedometer'], '225/45R17::235/40R18'),
  t('au-hp-kw', 'HP ↔ kW ↔ PS', 'Engine power conversions. Input like 150hp, 110kw, 152ps', 'value+hp|kw|ps', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*(hp|kw|ps)$/); if (!m) return bad('150hp, 110kw, 152ps');
    const v = parseFloat(m[1]);
    const kw = m[2] === 'kw' ? v : m[2] === 'hp' ? v * 0.7457 : v * 0.7355;
    return `${r1(kw)} kW = ${r1(kw / 0.7457)} hp (SAE) = ${r1(kw / 0.7355)} PS`;
  }, ['power', 'hp'], '150hp'),
  t('au-torque', 'Torque Nm ↔ lb-ft', 'Torque conversion. Input like 400nm or 295lbft', 'value+nm|lbft', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*(nm|lbft|lb-ft)$/); if (!m) return bad('400nm or 295lbft');
    const v = parseFloat(m[1]);
    return m[2] === 'nm' ? `${v} Nm = ${r1(v * 0.737562)} lb-ft` : `${v} lb-ft = ${r1(v / 0.737562)} Nm`;
  }, ['torque'], '400nm'),
  t('au-speed-rpm', 'Speed @ RPM', 'Road speed from gearing. Format: rpm::final drive ratio::gear ratio::tire size', 'rpm::final::gear::tire', (s) => {
    const p = s.split('::'); if (p.length < 4) return bad('3000::3.9::0.8::225/45R17');
    const [rpm, final, gear] = [parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2])];
    const tire = parseTire(p[3]);
    if (!rpm || !final || !gear || !tire) return bad('3000::3.9::0.8::225/45R17');
    const wheelRpm = rpm / (final * gear);
    const kmh = (wheelRpm * Math.PI * tireDiameterMm(tire) * 60) / 1e6;
    return `${rpm} rpm → ${r1(kmh)} km/h (${r1(kmh * 0.621371)} mph)`;
  }, ['gearing', 'rpm'], '3000::3.9::0.8::225/45R17'),
  t('au-braking', 'Stopping Distance', 'Reaction + braking distance. Format: speed km/h[::reaction s::friction μ]', 'km/h[::s::μ]', (s) => {
    const [kmh, reaction, mu] = nums(s); if (!kmh) return bad('100 or 100::1.5::0.7');
    const v = kmh / 3.6;
    const react = v * (reaction || 1);
    const brake = (v * v) / (2 * (mu || 0.7) * 9.80665);
    return [
      `At ${kmh} km/h:`,
      `Reaction (${reaction || 1} s): ${r1(react)} m`,
      `Braking (μ=${mu || 0.7}): ${r1(brake)} m`,
      `Total: ${r1(react + brake)} m`,
    ].join('\n');
  }, ['braking', 'safety'], '100'),
  t('au-depreciation', 'Car Depreciation', 'Value after N years (~18% year 1, 12% after). Format: price::years', 'price::years', (s) => {
    const [price, years] = nums(s); if (!price || years === undefined || isNaN(years)) return bad('35000::5');
    let v = price;
    const rows: string[] = [];
    for (let y = 1; y <= Math.min(years, 15); y++) {
      v *= y === 1 ? 0.82 : 0.88;
      rows.push(`Year ${y}: ${Math.round(v).toLocaleString()}`);
    }
    return rows.join('\n') + `\nTotal loss: ${Math.round(price - v).toLocaleString()} (${r1(((price - v) / price) * 100)}%)`;
  }, ['depreciation', 'value'], '35000::5'),
  t('au-ev-charge', 'EV Charging Time & Cost', 'Charge estimate. Format: battery kWh::charger kW::price per kWh[::from %::to %]', 'kWh::kW::price[::from::to]', (s) => {
    const [batt, kw, price, from, to] = nums(s); if (!batt || !kw) return bad('75::11::0.30::20::80');
    const f = isNaN(from) ? 20 : from, to2 = isNaN(to) ? 80 : to;
    const kwh = batt * ((to2 - f) / 100) / 0.92; // ~92% charging efficiency
    return [
      `${f}% → ${to2}% of ${batt} kWh ≈ ${r1(kwh)} kWh from the wall`,
      `Time @ ${kw} kW: ${r1(kwh / kw)} h`,
      price ? `Cost: ${r2(kwh * price)} (at ${price}/kWh)` : '',
    ].filter(Boolean).join('\n');
  }, ['ev', 'charging'], '75::11::0.30::20::80'),
];
