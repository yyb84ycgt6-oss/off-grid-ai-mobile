/**
 * Randomizers pack — pickers, shufflers, group splitters, decision tools.
 * Uses Math.random (fair-enough draws); security-grade randomness lives in crypto pack.
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
  id, name, description, category: 'random', tags: ['random', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const items = (s: string): string[] =>
  s.includes('\n') ? s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean) : s.split(',').map((x) => x.trim()).filter(Boolean);

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

const bad = (hint: string) => `Format: ${hint}`;

export const randomPack: ToolboxTool[] = [
  t('rd-pick-one', 'Pick One', 'Choose one item from a comma or newline list.', 'a, b, c', (s) => {
    const list = items(s); if (list.length < 2) return 'Give at least two options.';
    return list[Math.floor(Math.random() * list.length)];
  }, ['pick', 'choose'], 'red, green, blue'),
  t('rd-pick-n', 'Pick N (No Repeats)', 'Draw N unique items. Format: n::list', 'n::a,b,c', (s) => {
    const idx = s.indexOf('::'); if (idx < 0) return bad('2::alpha,beta,gamma,delta');
    const n = parseInt(s.slice(0, idx)); const list = items(s.slice(idx + 2));
    if (!n || n < 1) return 'N must be at least 1.';
    if (n > list.length) return `Asked for ${n} but only ${list.length} items given.`;
    return shuffle(list).slice(0, n).join('\n');
  }, ['pick', 'sample'], '2::alpha,beta,gamma,delta'),
  t('rd-shuffle', 'Shuffle List', 'Fisher-Yates shuffle of the given items.', 'list (comma or lines)', (s) => {
    const list = items(s); if (list.length < 2) return 'Give at least two items.';
    return shuffle(list).join('\n');
  }, ['shuffle', 'order'], 'ada\nalan\ngrace\nlinus'),
  t('rd-weighted', 'Weighted Pick', 'Draw honoring weights. Format: item:weight per line/comma', 'item:weight, …', (s) => {
    const rows = items(s).map((x) => { const m = x.match(/^(.*?):\s*([\d.]+)$/); return m ? { v: m[1].trim(), w: parseFloat(m[2]) } : null; }).filter(Boolean) as { v: string; w: number }[];
    if (rows.length < 2) return bad('common:70, rare:25, epic:5');
    const total = rows.reduce((a, b) => a + b.w, 0);
    let r = Math.random() * total;
    for (const row of rows) { if ((r -= row.w) < 0) return `${row.v} (p = ${((row.w / total) * 100).toFixed(1)}%)`; }
    return rows[rows.length - 1].v;
  }, ['weighted'], 'common:70, rare:25, epic:5'),
  t('rd-int', 'Random Integer', 'Uniform integer in a range. Format: min::max[::count]', 'min::max[::count]', (s) => {
    const p = s.split('::').map(Number); if (p.length < 2 || p.some((x, i) => i < 2 && isNaN(x))) return bad('1::100 or 1::100::5');
    const [min, max] = [Math.min(p[0], p[1]), Math.max(p[0], p[1])];
    const count = Math.min(Math.max(p[2] || 1, 1), 100);
    const draws = Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    return draws.join(count > 10 ? ', ' : '\n');
  }, ['integer'], '1::100::5'),
  t('rd-float', 'Random Float', 'Uniform float in a range. Format: min::max[::decimals]', 'min::max[::dp]', (s) => {
    const p = s.split('::').map(Number); if (p.length < 2 || isNaN(p[0]) || isNaN(p[1])) return bad('0::1::4');
    return (Math.random() * (p[1] - p[0]) + p[0]).toFixed(Math.min(Math.max(p[2] || 4, 0), 12));
  }, ['float'], '0::1::4'),
  t('rd-date', 'Random Date', 'A date between two dates. Format: YYYY-MM-DD::YYYY-MM-DD', 'start::end', (s) => {
    const p = s.split('::').map((x) => new Date(x.trim() + 'T00:00:00'));
    if (p.length < 2 || p.some((d) => isNaN(d.getTime()))) return bad('2020-01-01::2026-12-31');
    const t2 = p[0].getTime() + Math.random() * (p[1].getTime() - p[0].getTime());
    const d = new Date(t2);
    return `${d.toISOString().slice(0, 10)} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]})`;
  }, ['date'], '2020-01-01::2026-12-31'),
  t('rd-time', 'Random Time', 'A random time of day, optionally within a window. Format: [HH:MM::HH:MM]', '[start::end]', (s) => {
    const p = s.split('::').map((x) => x.trim()).filter(Boolean);
    const parse = (x: string) => { const m = x.match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : NaN; };
    const lo = p[0] ? parse(p[0]) : 0, hi = p[1] ? parse(p[1]) : 1439;
    if (isNaN(lo) || isNaN(hi)) return bad('09:00::17:30 (or empty for any time)');
    const v = Math.floor(Math.random() * (hi - lo + 1)) + lo;
    return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
  }, ['time'], '09:00::17:30'),
  t('rd-yesno', 'Yes / No / Maybe', 'A decisive answer. Input: optional "maybe" to allow a third outcome.', '[maybe]', (s) => {
    const opts = s.trim().toLowerCase() === 'maybe' ? ['Yes.', 'No.', 'Maybe — ask once more.'] : ['Yes.', 'No.'];
    return opts[Math.floor(Math.random() * opts.length)];
  }, ['decide'], 'maybe'),
  t('rd-teams', 'Team Splitter', 'Split names into N even teams. Format: n::names', 'n::names', (s) => {
    const idx = s.indexOf('::'); if (idx < 0) return bad('2::ada,alan,grace,linus');
    const n = parseInt(s.slice(0, idx)); const names = items(s.slice(idx + 2));
    if (!n || n < 2) return 'Need at least 2 teams.';
    if (names.length < n) return `Only ${names.length} name(s) for ${n} teams.`;
    const mixed = shuffle(names);
    const teams: string[][] = Array.from({ length: n }, () => []);
    mixed.forEach((name, i) => teams[i % n].push(name));
    return teams.map((t2, i) => `Team ${i + 1}: ${t2.join(', ')}`).join('\n');
  }, ['teams', 'groups'], '2::ada,alan,grace,linus,katherine,dennis'),
  t('rd-secret-santa', 'Secret Santa Pairs', 'Derangement — nobody draws themselves. Input: names', 'names (3+)', (s) => {
    const names = items(s);
    if (names.length < 3) return 'Need at least 3 names.';
    let receivers = shuffle(names);
    let guard = 0;
    while (receivers.some((r, i) => r === names[i]) && guard++ < 200) receivers = shuffle(names);
    if (receivers.some((r, i) => r === names[i])) return 'Could not find a derangement — try again.';
    return names.map((g, i) => `${g} → ${receivers[i]}`).join('\n');
  }, ['santa', 'pairs'], 'ada, alan, grace, linus'),
  t('rd-straws', 'Draw Straws', 'One item from the list gets the short straw.', 'names', (s) => {
    const list = items(s); if (list.length < 2) return 'Give at least two names.';
    const loser = list[Math.floor(Math.random() * list.length)];
    return list.map((n) => `${n}: ${n === loser ? 'SHORT straw' : 'long straw'}`).join('\n');
  }, ['straws'], 'ada, alan, grace'),
  t('rd-order', 'Random Turn Order', 'Numbered ordering of participants.', 'names', (s) => {
    const list = items(s); if (list.length < 2) return 'Give at least two names.';
    return shuffle(list).map((n, i) => `${i + 1}. ${n}`).join('\n');
  }, ['order', 'turns'], 'ada, alan, grace, linus'),
];
