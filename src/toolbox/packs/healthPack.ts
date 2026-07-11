/**
 * Health & Fitness pack — body metrics, training zones, pace math, nutrition.
 * Informational estimates from standard published formulas; not medical advice.
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
  id, name, description, category: 'health', tags: ['health', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const nums = (s: string): number[] => s.split('::').map((p) => parseFloat(p.trim()));
const bad = (hint: string) => `Format: ${hint}`;
const r1 = (n: number) => Math.round(n * 10) / 10;
const r0 = (n: number) => Math.round(n);

/** Mifflin-St Jeor BMR. sex: 'm' | 'f' */
const bmr = (kg: number, cm: number, age: number, sex: string): number =>
  10 * kg + 6.25 * cm - 5 * age + (sex.toLowerCase().startsWith('f') ? -161 : 5);

const paceToSec = (p: string): number => {
  const m = p.trim().match(/^(\d+):(\d{1,2})$/);
  return m ? +m[1] * 60 + +m[2] : NaN;
};
const secToPace = (s: number): string => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export const healthPack: ToolboxTool[] = [
  t('hl-bmi', 'BMI Calculator', 'Body Mass Index with WHO class. Format: kg::cm', 'weight kg::height cm', (s) => {
    const [kg, cm] = nums(s); if (!kg || !cm) return bad('kg::cm — e.g. 70::175');
    const bmi = kg / ((cm / 100) ** 2);
    const cls = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    return `BMI: ${r1(bmi)} (${cls})\nNormal range for ${cm} cm: ${r1(18.5 * (cm / 100) ** 2)}–${r1(24.9 * (cm / 100) ** 2)} kg`;
  }, ['bmi', 'weight'], '70::175'),
  t('hl-bmr', 'BMR (Mifflin-St Jeor)', 'Basal metabolic rate. Format: kg::cm::age::m|f', 'kg::cm::age::sex', (s) => {
    const p = s.split('::').map((x) => x.trim()); if (p.length < 4) return bad('kg::cm::age::m|f');
    const v = bmr(+p[0], +p[1], +p[2], p[3]); if (!isFinite(v)) return bad('kg::cm::age::m|f');
    return `BMR: ${r0(v)} kcal/day (calories burned at complete rest)`;
  }, ['bmr', 'calories'], '70::175::30::m'),
  t('hl-tdee', 'TDEE Calculator', 'Total daily energy expenditure. Format: kg::cm::age::sex::activity(1-5)', 'kg::cm::age::sex::1-5', (s) => {
    const p = s.split('::').map((x) => x.trim()); if (p.length < 5) return bad('kg::cm::age::m|f::activity 1-5');
    const mult = [1.2, 1.375, 1.55, 1.725, 1.9][Math.min(Math.max(+p[4], 1), 5) - 1];
    const base = bmr(+p[0], +p[1], +p[2], p[3]); if (!isFinite(base)) return bad('kg::cm::age::m|f::1-5');
    const tdee = base * mult;
    return `TDEE: ${r0(tdee)} kcal/day (activity ×${mult})\nCut (−20%): ${r0(tdee * 0.8)} · Maintain: ${r0(tdee)} · Bulk (+10%): ${r0(tdee * 1.1)}`;
  }, ['tdee', 'calories'], '70::175::30::m::3'),
  t('hl-bodyfat-navy', 'Body Fat % (Navy)', 'US Navy tape method. M: kg-unused::cm height::waist::neck. F adds hip. Format: sex::height::waist::neck[::hip] (cm)', 'sex::height::waist::neck[::hip]', (s) => {
    const p = s.split('::').map((x) => x.trim()); if (p.length < 4) return bad('m::175::85::38  or  f::165::75::32::95');
    const [h, w, n, hip] = [+p[1], +p[2], +p[3], +(p[4] ?? 0)];
    const f = p[0].toLowerCase().startsWith('f');
    if (f && !hip) return 'Female format needs hip: f::height::waist::neck::hip';
    const bf = f
      ? 495 / (1.29579 - 0.35004 * Math.log10(w + hip - n) + 0.221 * Math.log10(h)) - 450
      : 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
    if (!isFinite(bf) || bf < 0) return 'Measurements out of range — check waist > neck and all values in cm.';
    return `Estimated body fat: ${r1(bf)}%`;
  }, ['bodyfat'], 'm::175::85::38'),
  t('hl-ideal-weight', 'Ideal Weight Range', 'Healthy weight band for a height (BMI 18.5–24.9). Input: height cm', 'height cm', (s) => {
    const cm = parseFloat(s); if (!cm) return 'Enter height in cm.';
    const m2 = (cm / 100) ** 2;
    return `Healthy range at ${cm} cm: ${r1(18.5 * m2)}–${r1(24.9 * m2)} kg\nDevine formula: ${r1(f0(cm))} kg (m) / ${r1(f0(cm) - 4.5)} kg (f)`;
    function f0(c: number) { return 50 + 0.9 * (c - 152); }
  }, ['weight'], '175'),
  t('hl-max-hr', 'Max Heart Rate', 'Age-predicted HRmax (Tanaka: 208 − 0.7×age). Input: age', 'age', (s) => {
    const age = parseFloat(s); if (!age) return 'Enter age in years.';
    return `Tanaka: ${r0(208 - 0.7 * age)} bpm\nClassic (220−age): ${r0(220 - age)} bpm`;
  }, ['heart', 'hr'], '30'),
  t('hl-hr-zones', 'Heart Rate Zones', 'Five training zones from max HR (or age). Input: maxHR or age::rest (Karvonen)', 'maxHR  or  age::restHR', (s) => {
    const p = nums(s);
    const max = p.length > 1 ? 208 - 0.7 * p[0] : p[0] > 100 ? p[0] : 208 - 0.7 * p[0];
    const rest = p.length > 1 ? p[1] : 0;
    if (!isFinite(max)) return bad('maxHR (e.g. 190) or age::restHR (e.g. 30::60)');
    const zone = (lo: number, hi: number) => rest
      ? `${r0((max - rest) * lo + rest)}–${r0((max - rest) * hi + rest)}`
      : `${r0(max * lo)}–${r0(max * hi)}`;
    return [
      `Max HR: ${r0(max)} bpm${rest ? ` · Rest: ${rest} (Karvonen)` : ''}`,
      `Z1 Recovery  (50–60%): ${zone(0.5, 0.6)} bpm`,
      `Z2 Endurance (60–70%): ${zone(0.6, 0.7)} bpm`,
      `Z3 Tempo     (70–80%): ${zone(0.7, 0.8)} bpm`,
      `Z4 Threshold (80–90%): ${zone(0.8, 0.9)} bpm`,
      `Z5 VO2max    (90–100%): ${zone(0.9, 1)} bpm`,
    ].join('\n');
  }, ['heart', 'zones'], '190'),
  t('hl-water', 'Daily Water Intake', 'Baseline hydration estimate (35 ml/kg + exercise). Format: kg[::exercise minutes]', 'kg[::minutes]', (s) => {
    const [kg, min] = nums(s); if (!kg) return bad('kg or kg::exercise-minutes');
    const ml = kg * 35 + (min || 0) * 12;
    return `≈ ${(ml / 1000).toFixed(1)} L/day (${r0(ml)} ml)${min ? ` including +${r0(min * 12)} ml for ${min} min exercise` : ''}`;
  }, ['water', 'hydration'], '70::30'),
  t('hl-kcal-kj', 'Calories ↔ Kilojoules', 'Convert kcal to kJ or back. Format: 250kcal or 1046kj', 'e.g. 250kcal', (s) => {
    const m = s.trim().toLowerCase().match(/^([\d.]+)\s*(kcal|kj|cal)?$/); if (!m) return bad('250kcal or 1046kj');
    const v = parseFloat(m[1]);
    if (m[2] === 'kj') return `${v} kJ = ${r1(v / 4.184)} kcal`;
    return `${v} kcal = ${r1(v * 4.184)} kJ`;
  }, ['calories', 'energy'], '250kcal'),
  t('hl-macros', 'Macro Split', 'Grams of protein/carbs/fat for a calorie target. Format: kcal::P%::C%::F%', 'kcal::p::c::f', (s) => {
    const [kcal, p, c, f] = nums(s); if (!kcal) return bad('2000::30::40::30');
    const [pp, cc, ff] = [p || 30, c || 40, f || 30];
    if (Math.round(pp + cc + ff) !== 100) return `Percentages sum to ${pp + cc + ff} — must equal 100.`;
    return [
      `${kcal} kcal @ ${pp}/${cc}/${ff}:`,
      `Protein: ${r0((kcal * pp) / 100 / 4)} g (${r0((kcal * pp) / 100)} kcal)`,
      `Carbs:   ${r0((kcal * cc) / 100 / 4)} g (${r0((kcal * cc) / 100)} kcal)`,
      `Fat:     ${r0((kcal * ff) / 100 / 9)} g (${r0((kcal * ff) / 100)} kcal)`,
    ].join('\n');
  }, ['macros', 'nutrition'], '2000::30::40::30'),
  t('hl-protein', 'Protein Target', 'Daily protein by goal (g/kg bands). Input: kg', 'weight kg', (s) => {
    const kg = parseFloat(s); if (!kg) return 'Enter body weight in kg.';
    return [
      `Sedentary (0.8 g/kg): ${r0(kg * 0.8)} g`,
      `Active (1.2–1.6 g/kg): ${r0(kg * 1.2)}–${r0(kg * 1.6)} g`,
      `Muscle gain (1.6–2.2 g/kg): ${r0(kg * 1.6)}–${r0(kg * 2.2)} g`,
    ].join('\n');
  }, ['protein'], '70'),
  t('hl-pace-convert', 'Pace min/km ↔ min/mi', 'Convert running pace. Format: 5:30/km or 8:51/mi', 'm:ss/km or m:ss/mi', (s) => {
    const m = s.trim().match(/^(\d+:\d{1,2})\s*\/\s*(km|mi)$/i); if (!m) return bad('5:30/km or 8:51/mi');
    const sec = paceToSec(m[1]);
    return m[2].toLowerCase() === 'km'
      ? `${m[1]}/km = ${secToPace(sec * 1.609344)}/mi · ${(3600 / sec).toFixed(2)} km/h`
      : `${m[1]}/mi = ${secToPace(sec / 1.609344)}/km · ${(3600 / (sec / 1.609344)).toFixed(2)} km/h`;
  }, ['pace', 'running'], '5:30/km'),
  t('hl-race-time', 'Race Finish Predictor', 'Finish time from pace. Format: distance km::pace m:ss/km', 'km::m:ss', (s) => {
    const p = s.split('::'); if (p.length < 2) return bad('42.195::5:30');
    const km = parseFloat(p[0]); const sec = paceToSec(p[1]);
    if (!km || !sec) return bad('42.195::5:30');
    const total = km * sec;
    const h = Math.floor(total / 3600), mn = Math.floor((total % 3600) / 60), sc = Math.round(total % 60);
    return `${km} km @ ${p[1].trim()}/km → ${h}:${String(mn).padStart(2, '0')}:${String(sc).padStart(2, '0')}`;
  }, ['race', 'running'], '42.195::5:30'),
  t('hl-pace-from-run', 'Pace From a Run', 'Pace from distance + time. Format: km::h:mm:ss (or mm:ss)', 'km::time', (s) => {
    const p = s.split('::'); if (p.length < 2) return bad('10::52:30');
    const km = parseFloat(p[0]); const parts = p[1].trim().split(':').map(Number);
    if (!km || parts.some(isNaN)) return bad('10::52:30');
    const sec = parts.reduce((a, b) => a * 60 + b, 0);
    return `Pace: ${secToPace(sec / km)}/km · ${secToPace((sec / km) * 1.609344)}/mi · avg ${(km / (sec / 3600)).toFixed(2)} km/h`;
  }, ['pace'], '10::52:30'),
  t('hl-steps-km', 'Steps → Distance', 'Distance from step count. Format: steps[::height cm]', 'steps[::cm]', (s) => {
    const [steps, cm] = nums(s); if (!steps) return bad('8000 or 8000::175');
    const stride = cm ? cm * 0.414 / 100 : 0.75;
    return `${steps} steps ≈ ${(steps * stride / 1000).toFixed(2)} km (stride ${stride.toFixed(2)} m)`;
  }, ['steps', 'walking'], '8000::175'),
  t('hl-calories-met', 'Calories Burned (MET)', 'kcal from METs. Format: MET::kg::minutes (walking 3.5, running 9.8, cycling 7.5)', 'met::kg::min', (s) => {
    const [met, kg, min] = nums(s); if (!met || !kg || !min) return bad('9.8::70::30 (run 30 min at 70 kg)');
    return `≈ ${r0((met * 3.5 * kg) / 200 * min)} kcal (${met} MET × ${kg} kg × ${min} min)`;
  }, ['calories', 'exercise'], '9.8::70::30'),
  t('hl-sleep-cycles', 'Sleep Cycle Planner', 'Wake times in full 90-min cycles from a bedtime. Format: HH:MM (24h)', 'bedtime HH:MM', (s) => {
    const m = s.trim().match(/^(\d{1,2}):(\d{2})$/); if (!m) return bad('23:15');
    const base = +m[1] * 60 + +m[2] + 15; // +15 min to fall asleep
    const times = [4, 5, 6].map((c) => { const t2 = (base + c * 90) % 1440; return `${c} cycles (${c * 1.5} h): ${String(Math.floor(t2 / 60)).padStart(2, '0')}:${String(t2 % 60).padStart(2, '0')}`; });
    return `Bed at ${m[0]} (+15 min to fall asleep):\n${times.join('\n')}`;
  }, ['sleep'], '23:15'),
  t('hl-whr', 'Waist-Hip Ratio', 'WHR with WHO risk bands. Format: waist::hip (same unit)', 'waist::hip', (s) => {
    const [w, h] = nums(s); if (!w || !h) return bad('85::100');
    const whr = w / h;
    return `WHR: ${whr.toFixed(2)}\nWHO high-risk threshold: >0.90 (m), >0.85 (f)`;
  }, ['whr'], '85::100'),
  t('hl-bsa', 'Body Surface Area', 'Mosteller BSA. Format: kg::cm', 'kg::cm', (s) => {
    const [kg, cm] = nums(s); if (!kg || !cm) return bad('70::175');
    return `BSA: ${Math.sqrt((kg * cm) / 3600).toFixed(2)} m² (Mosteller)`;
  }, ['bsa'], '70::175'),
  t('hl-lbm', 'Lean Body Mass', 'Boer formula LBM. Format: kg::cm::m|f', 'kg::cm::sex', (s) => {
    const p = s.split('::').map((x) => x.trim()); if (p.length < 3) return bad('70::175::m');
    const [kg, cm] = [+p[0], +p[1]];
    const lbm = p[2].toLowerCase().startsWith('f') ? 0.252 * kg + 0.473 * cm - 48.3 : 0.407 * kg + 0.267 * cm - 19.2;
    if (!isFinite(lbm)) return bad('70::175::m');
    return `Lean body mass: ${r1(lbm)} kg (${r1((lbm / kg) * 100)}% of total)`;
  }, ['lbm'], '70::175::m'),
  t('hl-due-date', 'Pregnancy Due Date', 'Naegele estimate from last period. Input: YYYY-MM-DD', 'LMP date', (s) => {
    const d = new Date(s.trim() + 'T00:00:00'); if (isNaN(d.getTime())) return bad('YYYY-MM-DD');
    const due = new Date(d.getTime() + 280 * 86400000);
    const weeks = Math.floor((Date.now() - d.getTime()) / (7 * 86400000));
    return `Estimated due date: ${due.toISOString().slice(0, 10)}\nCurrent gestational age: ${weeks} weeks`;
  }, ['pregnancy'], '2026-01-01'),
  t('hl-caffeine', 'Caffeine Half-Life', 'Caffeine remaining over time (t½ ≈ 5 h). Format: mg::hours', 'mg::hours', (s) => {
    const [mg, h] = nums(s); if (!mg || h === undefined || isNaN(h)) return bad('200::6');
    const left = mg * Math.pow(0.5, h / 5);
    return `${mg} mg after ${h} h ≈ ${r0(left)} mg still active (${r0((left / mg) * 100)}%)`;
  }, ['caffeine'], '200::6'),
];
