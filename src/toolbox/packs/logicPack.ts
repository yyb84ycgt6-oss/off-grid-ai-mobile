/**
 * Logic & Bits pack — truth tables, boolean evaluation, bit surgery.
 * Includes a small recursive-descent parser for boolean expressions
 * (variables A–Z, operators ! & ^ | and parentheses, precedence ! > & > ^ > |).
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
  id, name, description, category: 'logic', tags: ['logic', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

type BoolEnv = Record<string, boolean>;

/** Parse + evaluate a boolean expression. Returns an evaluator or an error string. */
function compileBool(expr: string): { vars: string[]; evaluate: (env: BoolEnv) => boolean } | string {
  const src = expr
    .replace(/\b(AND|and)\b/g, '&').replace(/\b(OR|or)\b/g, '|')
    .replace(/\b(XOR|xor)\b/g, '^').replace(/\b(NOT|not)\b/g, '!')
    .replace(/&&/g, '&').replace(/\|\|/g, '|').replace(/\s+/g, '');
  if (!src) return 'Enter a boolean expression, e.g. (A & B) | !C';
  let i = 0;
  const vars = new Set<string>();
  const fail = { msg: '' };

  const parseOr = (env: BoolEnv): boolean => {
    let v = parseXor(env);
    while (src[i] === '|') { i++; const r = parseXor(env); v = v || r; }
    return v;
  };
  const parseXor = (env: BoolEnv): boolean => {
    let v = parseAnd(env);
    while (src[i] === '^') { i++; const r = parseAnd(env); v = v !== r; }
    return v;
  };
  const parseAnd = (env: BoolEnv): boolean => {
    let v = parseUnary(env);
    while (src[i] === '&') { i++; const r = parseUnary(env); v = v && r; }
    return v;
  };
  const parseUnary = (env: BoolEnv): boolean => {
    if (src[i] === '!') { i++; return !parseUnary(env); }
    if (src[i] === '(') {
      i++;
      const v = parseOr(env);
      if (src[i] !== ')') { fail.msg = 'Missing closing parenthesis.'; return false; }
      i++;
      return v;
    }
    const ch = src[i];
    if (ch === '1' || ch === '0') { i++; return ch === '1'; }
    if (/[A-Za-z]/.test(ch ?? '')) { i++; const name = ch.toUpperCase(); vars.add(name); return env[name] ?? false; }
    fail.msg = `Unexpected "${ch ?? 'end'}" at position ${i}.`;
    return false;
  };

  // First pass with empty env just to collect variables + syntax-check.
  i = 0; fail.msg = '';
  parseOr({});
  if (fail.msg) return fail.msg;
  if (i < src.length) return `Unexpected "${src[i]}" at position ${i}.`;

  const varList = [...vars].sort();
  return {
    vars: varList,
    evaluate: (env: BoolEnv) => { i = 0; fail.msg = ''; return parseOr(env); },
  };
}

const parseIntAny = (s: string): number => {
  const q = s.trim().toLowerCase();
  if (/^0x[0-9a-f]+$/.test(q)) return parseInt(q, 16);
  if (/^0b[01]+$/.test(q)) return parseInt(q.slice(2), 2);
  return parseInt(q, 10);
};

const showAll = (n: number): string =>
  `dec ${n} · hex 0x${(n >>> 0).toString(16).toUpperCase()} · bin ${(n >>> 0).toString(2)}`;

const bad = (hint: string) => `Format: ${hint}`;

export const logicPack: ToolboxTool[] = [
  t('lg-truth-table', 'Truth Table', 'Full table for a boolean expression. Vars A–Z, ops ! & ^ | ( ). AND/OR/XOR/NOT words work too.', 'expression', (s) => {
    const c = compileBool(s);
    if (typeof c === 'string') return c;
    if (!c.vars.length) return `Constant expression = ${c.evaluate({}) ? '1' : '0'}`;
    if (c.vars.length > 5) return `Too many variables (${c.vars.length}) — max 5 for a table.`;
    const rows: string[] = [`${c.vars.join(' ')} | out`];
    rows.push('-'.repeat(rows[0].length));
    for (let mask = 0; mask < 1 << c.vars.length; mask++) {
      const env: BoolEnv = {};
      c.vars.forEach((v, idx) => { env[v] = !!(mask & (1 << (c.vars.length - 1 - idx))); });
      rows.push(`${c.vars.map((v) => (env[v] ? '1' : '0')).join(' ')} |  ${c.evaluate(env) ? '1' : '0'}`);
    }
    return rows.join('\n');
  }, ['truth', 'boolean'], '(A & B) | !C'),
  t('lg-bool-eval', 'Boolean Evaluate', 'Evaluate an expression with given values. Format: expr::A=1,B=0,...', 'expr::assignments', (s) => {
    const p = s.split('::'); if (p.length < 2) return bad('(A&B)|C::A=1,B=0,C=1');
    const c = compileBool(p[0]);
    if (typeof c === 'string') return c;
    const env: BoolEnv = {};
    p[1].split(',').forEach((pair) => { const m = pair.trim().match(/^([A-Za-z])\s*=\s*(1|0|true|false)$/i); if (m) env[m[1].toUpperCase()] = m[2] === '1' || m[2].toLowerCase() === 'true'; });
    const missing = c.vars.filter((v) => !(v in env));
    if (missing.length) return `Missing values for: ${missing.join(', ')}`;
    return `${p[0].trim()} with ${c.vars.map((v) => `${v}=${env[v] ? 1 : 0}`).join(', ')} → ${c.evaluate(env) ? 'TRUE (1)' : 'FALSE (0)'}`;
  }, ['boolean'], '(A&B)|C::A=1,B=0,C=1'),
  t('lg-bitwise', 'Bitwise Operations', 'AND/OR/XOR of two numbers (dec, 0x, 0b). Format: a::b', 'a::b', (s) => {
    const p = s.split('::').map(parseIntAny); if (p.length < 2 || p.some(isNaN)) return bad('12::10 or 0xFF::0x0F');
    const [a, b] = p;
    return [`a     = ${showAll(a)}`, `b     = ${showAll(b)}`, `a & b = ${showAll(a & b)}`, `a | b = ${showAll(a | b)}`, `a ^ b = ${showAll(a ^ b)}`].join('\n');
  }, ['bitwise'], '12::10'),
  t('lg-bitnot', 'Bitwise NOT', '~n in a chosen bit width. Format: n[::bits 8/16/32]', 'n[::bits]', (s) => {
    const p = s.split('::'); const n = parseIntAny(p[0]); const bits = parseInt(p[1]) || 8;
    if (isNaN(n) || ![8, 16, 32].includes(bits)) return bad('12 or 12::16 (bits 8/16/32)');
    const mask = bits === 32 ? 0xffffffff : (1 << bits) - 1;
    const r = (~n >>> 0) & mask;
    return `~${n} (${bits}-bit) = ${showAll(r)}`;
  }, ['bitwise', 'not'], '12::8'),
  t('lg-shift', 'Bit Shifts', 'Left/right shift. Format: n::<<|>>::amount', 'n::<<::k', (s) => {
    const p = s.split('::'); if (p.length < 3) return bad('5::<<::2 or 40::>>::3');
    const n = parseIntAny(p[0]); const k = parseInt(p[2]);
    if (isNaN(n) || isNaN(k)) return bad('5::<<::2');
    const r = p[1].includes('<') ? n << k : n >>> k;
    return `${n} ${p[1].trim()} ${k} = ${showAll(r)}`;
  }, ['shift'], '5::<<::2'),
  t('lg-twos-complement', "Two's Complement", 'Signed representation of a number in N bits. Format: n::bits', 'n::bits', (s) => {
    const p = s.split('::'); const n = parseInt(p[0]); const bits = parseInt(p[1]) || 8;
    if (isNaN(n) || bits < 2 || bits > 32) return bad('-5::8');
    const max = 2 ** (bits - 1);
    if (n >= max || n < -max) return `${n} does not fit in ${bits}-bit signed range (−${max}…${max - 1}).`;
    const u = n < 0 ? (2 ** bits + n) : n;
    return `${n} in ${bits}-bit two's complement:\nbin ${u.toString(2).padStart(bits, '0')}\nhex 0x${u.toString(16).toUpperCase()}\nunsigned ${u}`;
  }, ['twos-complement'], '-5::8'),
  t('lg-bit-set', 'Set / Clear / Test Bit', 'Manipulate bit k. Format: n::set|clear|test|toggle::k', 'n::op::k', (s) => {
    const p = s.split('::'); if (p.length < 3) return bad('12::set::0');
    const n = parseIntAny(p[0]); const k = parseInt(p[2]); const op = p[1].trim().toLowerCase();
    if (isNaN(n) || isNaN(k) || k < 0 || k > 31) return bad('12::set::0 (bit 0–31)');
    if (op === 'test') return `bit ${k} of ${n} is ${(n >> k) & 1 ? 'SET (1)' : 'CLEAR (0)'}`;
    const r = op === 'set' ? n | (1 << k) : op === 'clear' ? n & ~(1 << k) : op === 'toggle' ? n ^ (1 << k) : NaN;
    if (isNaN(r)) return 'Op must be set, clear, test, or toggle.';
    return `${op} bit ${k}: ${showAll(r >>> 0)}`;
  }, ['bits'], '12::set::0'),
  t('lg-popcount', 'Popcount & Parity', 'Count set bits in a number.', 'number (dec/0x/0b)', (s) => {
    const n = parseIntAny(s); if (isNaN(n)) return 'Enter a number (dec, 0x…, 0b…).';
    let c = 0, v = n >>> 0;
    while (v) { c += v & 1; v >>>= 1; }
    return `${showAll(n)}\nSet bits: ${c} · Parity: ${c % 2 ? 'odd' : 'even'}`;
  }, ['popcount'], '0xFF'),
  t('lg-gray', 'Gray Code', 'Binary ↔ Gray code. Format: to|from::number', 'to|from::n', (s) => {
    const p = s.split('::'); if (p.length < 2) return bad('to::5 or from::7');
    const n = parseIntAny(p[1]); if (isNaN(n)) return bad('to::5');
    if (p[0].trim().toLowerCase() === 'to') {
      const g = n ^ (n >>> 1);
      return `binary ${n} (${n.toString(2)}) → gray ${g} (${g.toString(2)})`;
    }
    let b = n;
    for (let shift = 1; shift < 32; shift <<= 1) b ^= b >>> shift;
    return `gray ${n} (${n.toString(2)}) → binary ${b} (${b.toString(2)})`;
  }, ['gray'], 'to::5'),
  t('lg-bitmask-describe', 'Bitmask Describe', 'Which bit positions are set. Input: number', 'number', (s) => {
    const n = parseIntAny(s); if (isNaN(n)) return 'Enter a number (dec, 0x…, 0b…).';
    const set: number[] = [];
    for (let k = 0; k < 32; k++) if ((n >>> k) & 1) set.push(k);
    return `${showAll(n)}\nSet bits (LSB=0): ${set.length ? set.join(', ') : 'none'}\nAs powers of 2: ${set.length ? set.map((k) => 2 ** k).join(' + ') : '0'}`;
  }, ['bitmask'], '0b101101'),
  t('lg-demorgan', "De Morgan's Laws", 'Reference card with your expression slots. Input: A::B labels optional', 'press run', () => [
    "De Morgan's Laws:",
    '!(A & B)  =  !A | !B',
    '!(A | B)  =  !A & !B',
    '',
    'Distribution:',
    'A & (B | C)  =  (A & B) | (A & C)',
    'A | (B & C)  =  (A | B) & (A | C)',
    '',
    'Absorption: A | (A & B) = A · A & (A | B) = A',
    'Identity: A & 1 = A · A | 0 = A · A & 0 = 0 · A | 1 = 1',
  ].join('\n'), ['reference', 'boolean']),
  t('lg-karnaugh-hint', 'Minterms From Truth Column', 'Minterm indices from an output column (e.g. 0110). Input: bits, MSB row first', 'output column bits', (s) => {
    const bits = s.trim();
    if (!/^[01]+$/.test(bits)) return 'Enter the output column as 0/1 digits, e.g. 0110 for 2 vars.';
    const n = Math.log2(bits.length);
    if (!Number.isInteger(n)) return `Column length must be a power of 2 (got ${bits.length}).`;
    const minterms = [...bits].map((b, idx) => (b === '1' ? idx : -1)).filter((x) => x >= 0);
    return `${n} variable(s) · minterms Σm(${minterms.join(',')})\nMaxterms ΠM(${[...bits].map((b, idx) => (b === '0' ? idx : -1)).filter((x) => x >= 0).join(',')})`;
  }, ['karnaugh', 'minterms'], '0110'),
  t('lg-base-any', 'Any Base → Any Base', 'Convert between bases 2–36. Format: value::fromBase::toBase', 'value::from::to', (s) => {
    const p = s.split('::'); if (p.length < 3) return bad('ff::16::2');
    const from = parseInt(p[1]), to = parseInt(p[2]);
    if (from < 2 || from > 36 || to < 2 || to > 36) return 'Bases must be 2–36.';
    const n = parseInt(p[0].trim(), from);
    if (isNaN(n)) return `"${p[0].trim()}" is not valid in base ${from}.`;
    return `${p[0].trim()} (base ${from}) = ${n.toString(to).toUpperCase()} (base ${to}) = ${n} (dec)`;
  }, ['base', 'convert'], 'ff::16::2'),
  t('lg-flags-builder', 'Flags Builder', 'OR named flags into a mask. Format: name=bit lines, then ::picks', 'defs::picks', (s) => {
    const p = s.split('::'); if (p.length < 2) return 'Format: READ=0,WRITE=1,EXEC=2::READ,EXEC';
    const defs: Record<string, number> = {};
    p[0].split(/[,\n]/).forEach((d) => { const m = d.trim().match(/^(\w+)\s*=\s*(\d+)$/); if (m) defs[m[1].toUpperCase()] = +m[2]; });
    if (!Object.keys(defs).length) return 'No flag definitions found (name=bit).';
    let mask = 0;
    const picks = p[1].split(',').map((x) => x.trim().toUpperCase()).filter(Boolean);
    for (const pick of picks) {
      if (!(pick in defs)) return `Unknown flag: ${pick}. Defined: ${Object.keys(defs).join(', ')}`;
      mask |= 1 << defs[pick];
    }
    return `${picks.join(' | ')} = ${showAll(mask)}`;
  }, ['flags'], 'READ=0,WRITE=1,EXEC=2::READ,EXEC'),
];
