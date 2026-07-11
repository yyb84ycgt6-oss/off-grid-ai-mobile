/**
 * Data Wrangling pack — quick stats over pasted numbers, list/set ops,
 * CSV reshaping, ASCII visualisation. Everything runs on plain pasted text.
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
  id, name, description, category: 'data', tags: ['data', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

/** Pull every number out of free-form text (spaces, commas, newlines). */
const parseNums = (s: string): number[] =>
  (s.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) ?? []).map(Number);

const lines = (s: string): string[] => s.split(/\r?\n/).filter((l) => l.trim() !== '');
const r = (n: number, d = 4) => Number(n.toFixed(d)).toString();

const splitCsvLine = (line: string): string[] => line.split(',').map((c) => c.trim());

export const dataPack: ToolboxTool[] = [
  t('da-sum', 'Sum Numbers', 'Add every number found in the text.', 'numbers (any layout)', (s) => {
    const n = parseNums(s); if (!n.length) return 'No numbers found.';
    return `Sum: ${r(n.reduce((a, b) => a + b, 0))} (${n.length} values)`;
  }, ['sum'], '12 7.5 30\n4, 8'),
  t('da-summary', 'Stats Summary', 'Count, sum, mean, median, min, max, stddev of pasted numbers.', 'numbers', (s) => {
    const n = parseNums(s).sort((a, b) => a - b); if (!n.length) return 'No numbers found.';
    const sum = n.reduce((a, b) => a + b, 0); const mean = sum / n.length;
    const median = n.length % 2 ? n[(n.length - 1) / 2] : (n[n.length / 2 - 1] + n[n.length / 2]) / 2;
    const sd = Math.sqrt(n.reduce((a, b) => a + (b - mean) ** 2, 0) / n.length);
    return [`Count: ${n.length}`, `Sum: ${r(sum)}`, `Mean: ${r(mean)}`, `Median: ${r(median)}`, `Min: ${r(n[0])} · Max: ${r(n[n.length - 1])}`, `Std dev (pop): ${r(sd)}`].join('\n');
  }, ['stats'], '4 8 15 16 23 42'),
  t('da-sort-numeric', 'Sort Lines Numerically', 'Sort lines by their numeric value (not alphabetically).', 'one number/line', (s) => {
    const ls = lines(s); if (!ls.length) return 'Paste lines to sort.';
    return ls.sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0)).join('\n');
  }, ['sort'], '10\n2\n33\n4'),
  t('da-sort-length', 'Sort Lines by Length', 'Shortest to longest line.', 'lines', (s) => {
    const ls = lines(s); if (!ls.length) return 'Paste lines to sort.';
    return ls.sort((a, b) => a.length - b.length).join('\n');
  }, ['sort'], 'banana\nfig\napple'),
  t('da-freq', 'Frequency Count', 'Count duplicate lines, most common first.', 'lines', (s) => {
    const ls = lines(s).map((l) => l.trim()); if (!ls.length) return 'Paste lines to count.';
    const freq = new Map<string, number>();
    ls.forEach((l) => freq.set(l, (freq.get(l) ?? 0) + 1));
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([v, c]) => `${String(c).padStart(4)} × ${v}`).join('\n');
  }, ['frequency', 'count'], 'a\nb\na\nc\na\nb'),
  t('da-histogram', 'ASCII Histogram', 'Bar chart of label:value lines (or plain numbers).', 'label:value per line', (s) => {
    const ls = lines(s); if (!ls.length) return 'Paste label:value lines, e.g. mon:12';
    const rows = ls.map((l) => {
      const m = l.match(/^(.*?)[:\t,]\s*(-?[\d.]+)\s*$/);
      return m ? { label: m[1].trim(), v: parseFloat(m[2]) } : { label: l.trim(), v: parseFloat(l) };
    }).filter((x) => !isNaN(x.v));
    if (!rows.length) return 'No numeric values found.';
    const max = Math.max(...rows.map((x) => Math.abs(x.v)));
    const w = Math.max(...rows.map((x) => x.label.length));
    return rows.map((x) => `${x.label.padEnd(w)} ${'#'.repeat(Math.max(1, Math.round((Math.abs(x.v) / max) * 40)))} ${x.v}`).join('\n');
  }, ['chart', 'histogram'], 'mon:12\ntue:30\nwed:22\nthu:8'),
  t('da-transpose-csv', 'Transpose CSV', 'Swap rows and columns of comma-separated data.', 'CSV text', (s) => {
    const rows = lines(s).map(splitCsvLine); if (!rows.length) return 'Paste CSV rows.';
    const cols = Math.max(...rows.map((r2) => r2.length));
    return Array.from({ length: cols }, (_, c) => rows.map((r2) => r2[c] ?? '').join(',')).join('\n');
  }, ['csv', 'transpose'], 'a,b,c\n1,2,3'),
  t('da-csv-column', 'Extract CSV Column', 'Pull one column out of CSV. Format: index (1-based)::csv', 'n::csv', (s) => {
    const idx = s.indexOf('::'); if (idx < 0) return 'Format: 2::a,b,c\\n1,2,3';
    const n = parseInt(s.slice(0, idx)); const body = s.slice(idx + 2);
    if (!n) return 'Column index must be 1 or higher.';
    return lines(body).map((l) => splitCsvLine(l)[n - 1] ?? '').join('\n');
  }, ['csv', 'column'], '2::a,b,c\n1,2,3'),
  t('da-csv-md', 'CSV → Markdown Table', 'First row becomes the header.', 'CSV text', (s) => {
    const rows = lines(s).map(splitCsvLine); if (rows.length < 1) return 'Paste CSV with a header row.';
    const head = `| ${rows[0].join(' | ')} |`;
    const sep = `| ${rows[0].map(() => '---').join(' | ')} |`;
    const body = rows.slice(1).map((r2) => `| ${r2.join(' | ')} |`).join('\n');
    return [head, sep, body].filter(Boolean).join('\n');
  }, ['csv', 'markdown'], 'name,score\nada,99\nalan,97'),
  t('da-md-csv', 'Markdown Table → CSV', 'Strip pipes and separator row back to CSV.', 'markdown table', (s) => {
    const out = lines(s)
      .filter((l) => !/^\s*\|?[\s:|-]+\|?\s*$/.test(l))
      .map((l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim()).join(','));
    return out.length ? out.join('\n') : 'Paste a Markdown table.';
  }, ['markdown', 'csv'], '| a | b |\n| --- | --- |\n| 1 | 2 |'),
  t('da-json-lines', 'JSON Array → Lines', 'Flatten a JSON array of strings/numbers to one value per line.', 'JSON array', (s) => {
    try {
      const arr = JSON.parse(s);
      if (!Array.isArray(arr)) return 'Input is valid JSON but not an array.';
      return arr.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join('\n');
    } catch (e) { return `Invalid JSON: ${(e as Error).message}`; }
  }, ['json'], '["a","b","c"]'),
  t('da-lines-json', 'Lines → JSON Array', 'Each line becomes an array element (numbers stay numeric).', 'lines', (s) => {
    const ls = lines(s); if (!ls.length) return 'Paste lines.';
    return JSON.stringify(ls.map((l) => { const n = Number(l.trim()); return l.trim() !== '' && !isNaN(n) ? n : l; }), null, 2);
  }, ['json'], 'a\nb\n42'),
  t('da-set-ops', 'Set Operations', 'Union/intersection/difference of two comma lists. Format: op::list1::list2 (op = and|or|not)', 'and|or|not::a,b::b,c', (s) => {
    const p = s.split('::'); if (p.length < 3) return 'Format: and::a,b,c::b,c,d (and=∩, or=∪, not=−)';
    const A = new Set(p[1].split(',').map((x) => x.trim()).filter(Boolean));
    const B = new Set(p[2].split(',').map((x) => x.trim()).filter(Boolean));
    const op = p[0].trim().toLowerCase();
    let out: string[];
    if (op === 'and') out = [...A].filter((x) => B.has(x));
    else if (op === 'or') out = [...new Set([...A, ...B])];
    else if (op === 'not') out = [...A].filter((x) => !B.has(x));
    else return 'Op must be and (∩), or (∪), or not (A−B).';
    return out.length ? out.join(', ') : '(empty set)';
  }, ['set', 'union', 'intersection'], 'and::a,b,c::b,c,d'),
  t('da-running-total', 'Running Total', 'Cumulative sum line by line.', 'one number/line', (s) => {
    const n = lines(s).map(Number); if (!n.length || n.some(isNaN)) return 'One number per line.';
    let acc = 0;
    return n.map((v) => { acc += v; return `${v}\t→ ${r(acc)}`; }).join('\n');
  }, ['cumulative'], '100\n250\n-75\n300'),
  t('da-pct-change', 'Percent Change', 'Change between two values. Format: from::to', 'from::to', (s) => {
    const p = s.split('::').map(Number); if (p.length < 2 || p.some(isNaN)) return 'Format: 120::150';
    if (p[0] === 0) return 'Cannot compute percent change from zero.';
    const ch = ((p[1] - p[0]) / Math.abs(p[0])) * 100;
    return `${p[0]} → ${p[1]}: ${ch >= 0 ? '+' : ''}${r(ch, 2)}%\n×${r(p[1] / p[0])} multiplier`;
  }, ['percent'], '120::150'),
  t('da-normalize', 'Normalize 0–1', 'Scale numbers to the 0–1 range (min-max).', 'numbers', (s) => {
    const n = parseNums(s); if (n.length < 2) return 'Need at least two numbers.';
    const min = Math.min(...n), max = Math.max(...n);
    if (min === max) return 'All values identical — nothing to scale.';
    return n.map((v) => r((v - min) / (max - min))).join('\n');
  }, ['normalize', 'scale'], '10 20 15 30'),
  t('da-zscore', 'Z-Scores', 'Standard scores for each value.', 'numbers', (s) => {
    const n = parseNums(s); if (n.length < 2) return 'Need at least two numbers.';
    const mean = n.reduce((a, b) => a + b, 0) / n.length;
    const sd = Math.sqrt(n.reduce((a, b) => a + (b - mean) ** 2, 0) / n.length);
    if (!sd) return 'Standard deviation is zero.';
    return n.map((v) => `${v}\tz = ${r((v - mean) / sd, 2)}`).join('\n');
  }, ['zscore', 'stats'], '4 8 15 16 23 42'),
  t('da-outliers', 'Outlier Detection (IQR)', 'Flags values beyond 1.5×IQR from the quartiles.', 'numbers', (s) => {
    const n = parseNums(s).sort((a, b) => a - b); if (n.length < 4) return 'Need at least 4 numbers.';
    const q = (f: number) => { const pos = f * (n.length - 1); const lo = Math.floor(pos); return n[lo] + (n[Math.min(lo + 1, n.length - 1)] - n[lo]) * (pos - lo); };
    const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
    const out = n.filter((v) => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
    return `Q1: ${r(q1)} · Q3: ${r(q3)} · IQR: ${r(iqr)}\nFences: ${r(q1 - 1.5 * iqr)} … ${r(q3 + 1.5 * iqr)}\nOutliers: ${out.length ? out.join(', ') : 'none'}`;
  }, ['outliers', 'iqr'], '2 3 3 4 4 5 5 6 42'),
  t('da-rank', 'Rank Values', 'Rank numbers descending (1 = largest).', 'numbers', (s) => {
    const n = parseNums(s); if (!n.length) return 'No numbers found.';
    const sorted = [...n].sort((a, b) => b - a);
    return n.map((v) => `${v}\t#${sorted.indexOf(v) + 1}`).join('\n');
  }, ['rank'], '82 95 61 95 70'),
  t('da-weighted-avg', 'Weighted Average', 'Mean with weights. Format: value:weight per line', 'value:weight lines', (s) => {
    const rows = lines(s).map((l) => l.split(/[:\t,]/).map(Number)).filter((p) => p.length >= 2 && !p.some(isNaN));
    if (!rows.length) return 'Format: one "value:weight" per line, e.g. 90:0.4';
    const wsum = rows.reduce((a, [, w]) => a + w, 0);
    if (!wsum) return 'Weights sum to zero.';
    return `Weighted avg: ${r(rows.reduce((a, [v, w]) => a + v * w, 0) / wsum)} (weights total ${r(wsum)})`;
  }, ['average', 'weighted'], '90:0.4\n75:0.6'),
];
