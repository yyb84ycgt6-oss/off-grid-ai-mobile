/**
 * Electronics Bench pack — resistor codes, LED math, RC circuits, power.
 * Standard EE reference formulas, fully offline.
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
  id, name, description, category: 'electronics', tags: ['electronics', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const nums = (s: string): number[] => s.split('::').map((p) => parseFloat(p.trim()));
const bad = (hint: string) => `Format: ${hint}`;
const sig = (n: number, d = 4) => Number(n.toPrecision(d)).toString();

const COLORS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white'];
const TOL: Record<string, string> = { brown: '±1%', red: '±2%', green: '±0.5%', blue: '±0.25%', violet: '±0.1%', grey: '±0.05%', gold: '±5%', silver: '±10%' };

const fmtOhms = (v: number): string =>
  v >= 1e6 ? `${sig(v / 1e6)} MΩ` : v >= 1e3 ? `${sig(v / 1e3)} kΩ` : `${sig(v)} Ω`;

/** Parse values like 4.7k, 220, 1M, 100n, 10u into a number (base unit). */
const parseSuffixed = (s: string): number => {
  const m = s.trim().match(/^([\d.]+)\s*(p|n|u|µ|m|k|meg|M|g|G)?/);
  if (!m) return NaN;
  const mult: Record<string, number> = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, k: 1e3, meg: 1e6, M: 1e6, g: 1e9, G: 1e9 };
  return parseFloat(m[1]) * (m[2] ? mult[m[2]] : 1);
};

export const electronicsPack: ToolboxTool[] = [
  t('el-resistor-decode', 'Resistor Color Decode', '4/5-band color code → value. Input: colors space-separated', 'e.g. red red brown gold', (s) => {
    const bands = s.trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
    if (bands.length < 3 || bands.length > 5) return bad('red red brown gold (3–5 bands)');
    const digits = bands.slice(0, bands.length >= 5 ? 3 : 2).map((b) => COLORS.indexOf(b));
    if (digits.some((d) => d < 0)) return `Unknown color. Valid: ${COLORS.join(', ')} (+gold/silver multiplier).`;
    const multBand = bands[bands.length >= 5 ? 3 : 2];
    const mult = multBand === 'gold' ? 0.1 : multBand === 'silver' ? 0.01 : COLORS.indexOf(multBand);
    if (mult < 0) return `Bad multiplier band: ${multBand}`;
    const base = digits.reduce((a, d) => a * 10 + d, 0);
    const value = base * (multBand === 'gold' || multBand === 'silver' ? mult : 10 ** mult);
    const tol = TOL[bands[bands.length - 1]] ?? (bands.length <= 3 ? '±20%' : '');
    return `${fmtOhms(value)} ${tol}`;
  }, ['resistor'], 'red red brown gold'),
  t('el-resistor-encode', 'Value → Color Code', 'Resistance to 4-band colors. Input like 220, 4.7k, 1M', 'resistance', (s) => {
    const v = parseSuffixed(s); if (!v || v <= 0) return bad('220, 4.7k, 1M');
    let norm = v, exp = 0;
    while (norm >= 100) { norm /= 10; exp++; }
    while (norm < 10 && exp > -2) { norm *= 10; exp--; }
    const d1 = Math.floor(norm / 10), d2 = Math.round(norm % 10);
    const multName = exp >= 0 ? COLORS[exp] : exp === -1 ? 'gold' : 'silver';
    return `${fmtOhms(v)} → ${COLORS[d1]} ${COLORS[d2]} ${multName} (+ gold for ±5%)`;
  }, ['resistor'], '4.7k'),
  t('el-led-resistor', 'LED Series Resistor', 'R for an LED. Format: supply V::LED Vf::current mA', 'Vs::Vf::mA', (s) => {
    const [vs, vf, ma] = nums(s); if (!vs || !vf || !ma) return bad('5::2::20');
    if (vf >= vs) return 'LED forward voltage must be below supply voltage.';
    const r = ((vs - vf) / ma) * 1000;
    const std = [10, 22, 47, 68, 100, 150, 220, 330, 470, 680, 1000, 1500, 2200, 3300, 4700, 10000].find((x) => x >= r) ?? Math.ceil(r);
    return `Exact: ${fmtOhms(r)}\nNearest standard ≥: ${fmtOhms(std)}\nPower: ${sig(((vs - vf) * ma) / 1000)} W (use ≥ ¼W if under 0.25)`;
  }, ['led'], '5::2::20'),
  t('el-voltage-divider', 'Voltage Divider', 'Vout from R1/R2. Format: Vin::R1::R2', 'Vin::R1::R2', (s) => {
    const p = s.split('::'); if (p.length < 3) return bad('12::10k::4.7k');
    const vin = parseFloat(p[0]), r1 = parseSuffixed(p[1]), r2 = parseSuffixed(p[2]);
    if (!vin || !r1 || !r2) return bad('12::10k::4.7k');
    return `Vout = ${sig(vin * (r2 / (r1 + r2)))} V\nDivider current: ${sig((vin / (r1 + r2)) * 1000)} mA`;
  }, ['divider'], '12::10k::4.7k'),
  t('el-r-series-parallel', 'Resistors Series/Parallel', 'Combined resistance. Format: s|p::values (4.7k, 220...)', 's|p::r1,r2,...', (s) => {
    const p = s.split('::'); if (p.length < 2) return bad('p::10k,10k or s::220,330');
    const vals = p[1].split(/[\s,]+/).map(parseSuffixed).filter((v) => v > 0);
    if (!vals.length) return bad('p::10k,10k');
    const series = vals.reduce((a, b) => a + b, 0);
    const parallel = 1 / vals.reduce((a, b) => a + 1 / b, 0);
    return p[0].trim().toLowerCase().startsWith('s')
      ? `Series: ${fmtOhms(series)}`
      : `Parallel: ${fmtOhms(parallel)}`;
  }, ['resistor'], 'p::10k,10k'),
  t('el-cap-code', 'Capacitor Code', '3-digit code ↔ value (104 → 100 nF). Input: code or value like 100n', 'code or value', (s) => {
    const q = s.trim();
    if (/^\d{3}$/.test(q)) {
      const pf = parseInt(q.slice(0, 2)) * 10 ** parseInt(q[2]);
      return pf >= 1e6 ? `${q} = ${sig(pf / 1e6)} µF` : pf >= 1e3 ? `${q} = ${sig(pf / 1e3)} nF` : `${q} = ${pf} pF`;
    }
    const f = parseSuffixed(q); if (!f) return bad('104 (code) or 100n / 4.7u (value)');
    const pf = f * 1e12;
    const exp = Math.max(0, Math.floor(Math.log10(pf)) - 1);
    return `${q} ≈ code ${Math.round(pf / 10 ** exp)}${exp}`;
  }, ['capacitor'], '104'),
  t('el-cap-series-parallel', 'Capacitors Series/Parallel', 'Combined capacitance (note: opposite of resistors). Format: s|p::values', 's|p::c1,c2,...', (s) => {
    const p = s.split('::'); if (p.length < 2) return bad('s::100n,100n');
    const vals = p[1].split(/[\s,]+/).map(parseSuffixed).filter((v) => v > 0);
    if (!vals.length) return bad('s::100n,100n');
    const series = 1 / vals.reduce((a, b) => a + 1 / b, 0);
    const parallel = vals.reduce((a, b) => a + b, 0);
    const fmt = (f: number) => f >= 1e-6 ? `${sig(f * 1e6)} µF` : f >= 1e-9 ? `${sig(f * 1e9)} nF` : `${sig(f * 1e12)} pF`;
    return p[0].trim().toLowerCase().startsWith('s') ? `Series: ${fmt(series)}` : `Parallel: ${fmt(parallel)}`;
  }, ['capacitor'], 's::100n,100n'),
  t('el-rc-time', 'RC Time Constant', 'τ = RC and charge times. Format: R::C (e.g. 10k::100u)', 'R::C', (s) => {
    const p = s.split('::'); if (p.length < 2) return bad('10k::100u');
    const r = parseSuffixed(p[0]), c = parseSuffixed(p[1]);
    if (!r || !c) return bad('10k::100u');
    const tau = r * c;
    const fmt = (x: number) => x >= 1 ? `${sig(x)} s` : x >= 1e-3 ? `${sig(x * 1e3)} ms` : `${sig(x * 1e6)} µs`;
    return `τ = ${fmt(tau)}\n63% charge: ${fmt(tau)} · 95%: ${fmt(3 * tau)} · 99%: ${fmt(5 * tau)}\nCutoff freq: ${sig(1 / (2 * Math.PI * tau))} Hz`;
  }, ['rc', 'filter'], '10k::100u'),
  t('el-freq-period', 'Frequency ↔ Period', 'Convert f to T or back. Input like 50Hz, 1kHz, 20ms, 100us', 'freq or period', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*(ghz|mhz|khz|hz|s|ms|us|µs|ns)$/);
    if (!m) return bad('50hz, 1khz, 20ms, 100us');
    const v = parseFloat(m[1]);
    const isFreq = m[2].endsWith('hz');
    const hz = isFreq ? v * ({ hz: 1, khz: 1e3, mhz: 1e6, ghz: 1e9 } as Record<string, number>)[m[2]] : 1 / (v * ({ s: 1, ms: 1e-3, us: 1e-6, 'µs': 1e-6, ns: 1e-9 } as Record<string, number>)[m[2]]);
    const t2 = 1 / hz;
    const fmtT = t2 >= 1 ? `${sig(t2)} s` : t2 >= 1e-3 ? `${sig(t2 * 1e3)} ms` : t2 >= 1e-6 ? `${sig(t2 * 1e6)} µs` : `${sig(t2 * 1e9)} ns`;
    const fmtF = hz >= 1e9 ? `${sig(hz / 1e9)} GHz` : hz >= 1e6 ? `${sig(hz / 1e6)} MHz` : hz >= 1e3 ? `${sig(hz / 1e3)} kHz` : `${sig(hz)} Hz`;
    return `f = ${fmtF}\nT = ${fmtT}`;
  }, ['frequency'], '1khz'),
  t('el-battery-life', 'Battery Life', 'Runtime from capacity and load. Format: mAh::load mA[::efficiency %]', 'mAh::mA[::%]', (s) => {
    const [mah, ma, eff] = nums(s); if (!mah || !ma) return bad('2000::150 or 2000::150::85');
    const h = (mah / ma) * ((eff || 100) / 100);
    return `≈ ${h.toFixed(1)} h (${Math.floor(h / 24)} d ${Math.round(h % 24)} h)${eff ? ` at ${eff}% efficiency` : ''}`;
  }, ['battery'], '2000::150::85'),
  t('el-power', 'Electrical Power', 'P = VI, plus energy cost. Format: V::A[::hours/day::price per kWh]', 'V::A[::h::price]', (s) => {
    const [v, a, h, price] = nums(s); if (!v || !a) return bad('230::2 or 230::2::4::0.30');
    const w = v * a;
    let out = `P = ${sig(w)} W`;
    if (h) {
      const kwhDay = (w * h) / 1000;
      out += `\nDaily: ${sig(kwhDay)} kWh · Monthly: ${sig(kwhDay * 30)} kWh`;
      if (price) out += `\nMonthly cost: ${sig(kwhDay * 30 * price)} (at ${price}/kWh)`;
    }
    return out;
  }, ['power'], '230::2::4::0.30'),
  t('el-awg', 'Wire Gauge (AWG)', 'AWG → diameter, area, and typical max current. Input: AWG number', 'AWG', (s) => {
    const awg = parseInt(s); if (isNaN(awg) || awg < 0 || awg > 40) return 'Enter AWG 0–40.';
    const dMm = 0.127 * 92 ** ((36 - awg) / 39);
    const area = Math.PI * (dMm / 2) ** 2;
    const amps: Record<number, number> = { 10: 30, 12: 20, 14: 15, 16: 10, 18: 7, 20: 5, 22: 3, 24: 2 };
    return `AWG ${awg}: Ø ${dMm.toFixed(3)} mm · ${area.toFixed(3)} mm²${amps[awg] ? ` · ~${amps[awg]} A (chassis)` : ''}`;
  }, ['wire', 'awg'], '14'),
  t('el-dbm', 'dBm ↔ Milliwatts', 'RF power conversion. Input like 20dbm or 100mw', 'dBm or mW', (s) => {
    const m = s.trim().toLowerCase().match(/^(-?[\d.]+)\s*(dbm|mw|w)$/); if (!m) return bad('20dbm, 100mw, 1w');
    const v = parseFloat(m[1]);
    if (m[2] === 'dbm') return `${v} dBm = ${sig(10 ** (v / 10))} mW`;
    const mw = m[2] === 'w' ? v * 1000 : v;
    return `${sig(mw)} mW = ${sig(10 * Math.log10(mw))} dBm`;
  }, ['rf', 'dbm'], '20dbm'),
  t('el-duty-cycle', 'Duty Cycle', 'PWM duty from on/off time, or average voltage. Format: on::off (ms) [::Vhigh]', 'on::off[::V]', (s) => {
    const [on, off, v] = nums(s); if (isNaN(on) || isNaN(off) || on + off === 0) return bad('2::8 or 2::8::5');
    const duty = (on / (on + off)) * 100;
    return `Duty: ${duty.toFixed(1)}% · f = ${sig(1000 / (on + off))} Hz${v ? ` · Vavg = ${sig((v * duty) / 100)} V` : ''}`;
  }, ['pwm'], '2::8::5'),
  t('el-ohm-power', 'Power Dissipation', 'P across a resistor. Format: V::R or i=A::r=R', 'V::R', (s) => {
    const p = s.split('::'); if (p.length < 2) return bad('12::220 (V::Ω)');
    const v = parseFloat(p[0]), r = parseSuffixed(p[1]);
    if (isNaN(v) || !r) return bad('12::220');
    const w = (v * v) / r;
    return `P = ${sig(w)} W · I = ${sig((v / r) * 1000)} mA\n${w > 0.25 ? 'Needs > ¼W rated resistor.' : 'A standard ¼W resistor is fine.'}`;
  }, ['power', 'resistor'], '12::220'),
];
