/**
 * Math & Numbers pack — calculators, number theory, statistics, sequences.
 * A small safe arithmetic evaluator (no eval) powers the calculator tools.
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
  id, name, description, category: 'math', tags: ['math', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const nums = (s: string): number[] => (s.match(/-?\d+(\.\d+)?/g) || []).map(Number);

/** Safe arithmetic evaluator: shunting-yard over + - * / % ^ and parentheses. */
const evalExpr = (expr: string): number => {
  const tokens = expr.match(/\d+\.?\d*|[()+\-*/%^]/g);
  if (!tokens) throw new Error('empty');
  const out: (number | string)[] = [];
  const ops: string[] = [];
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };
  const right: Record<string, boolean> = { '^': true };
  let prev: string | null = null;
  for (let tk of tokens) {
    if (/\d/.test(tk)) { out.push(parseFloat(tk)); prev = 'num'; }
    else if (tk === '(') { ops.push(tk); prev = '('; }
    else if (tk === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop()!);
      if (!ops.length) throw new Error('mismatched )');
      ops.pop(); prev = 'num';
    } else {
      if ((tk === '-' || tk === '+') && (prev === null || prev === '(' || prev === 'op')) { out.push(0); }
      while (ops.length && ops[ops.length - 1] !== '(' && (prec[ops[ops.length - 1]] > prec[tk] || (prec[ops[ops.length - 1]] === prec[tk] && !right[tk]))) out.push(ops.pop()!);
      ops.push(tk); prev = 'op';
    }
  }
  while (ops.length) { const o = ops.pop()!; if (o === '(') throw new Error('mismatched ('); out.push(o); }
  const st: number[] = [];
  for (const tk of out) {
    if (typeof tk === 'number') st.push(tk);
    else {
      const b = st.pop()!, a = st.pop()!;
      st.push(tk === '+' ? a + b : tk === '-' ? a - b : tk === '*' ? a * b : tk === '/' ? a / b : tk === '%' ? a % b : Math.pow(a, b));
    }
  }
  if (st.length !== 1) throw new Error('bad expression');
  return st[0];
};

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

export const mathPack: ToolboxTool[] = [
  t('math-calc', 'Calculator', 'Evaluate an arithmetic expression (+ - * / % ^ and parentheses).', 'e.g. (2+3)*4^2', (s) => {
    try { return `${s.trim()} = ${Math.round(evalExpr(s) * 1e10) / 1e10}`; } catch { return 'Invalid expression. Use + - * / % ^ and parentheses.'; }
  }, ['calc'], '(2+3)*4^2'),
  t('math-percent-of', 'Percent Of', 'Compute X% of Y. Format: percent::value', 'percent::value', (s) => {
    const [p, v] = s.split('::').map(Number); if (isNaN(p) || isNaN(v)) return 'Format: percent::value  (e.g. 15::200)';
    return `${p}% of ${v} = ${p / 100 * v}`;
  }, ['percent'], '15::200'),
  t('math-percent-change', 'Percent Change', 'Percent change from A to B. Format: from::to', 'from::to', (s) => {
    const [a, b] = s.split('::').map(Number); if (isNaN(a) || isNaN(b) || a === 0) return 'Format: from::to  (from ≠ 0, e.g. 80::100)';
    const pct = (b - a) / Math.abs(a) * 100;
    return `${a} → ${b} = ${pct >= 0 ? '+' : ''}${Math.round(pct * 100) / 100}%`;
  }, ['percent'], '80::100'),
  t('math-percent-ratio', 'What Percent', 'X is what percent of Y. Format: part::whole', 'part::whole', (s) => {
    const [a, b] = s.split('::').map(Number); if (isNaN(a) || isNaN(b) || b === 0) return 'Format: part::whole  (whole ≠ 0)';
    return `${a} is ${Math.round(a / b * 10000) / 100}% of ${b}`;
  }, ['percent'], '25::200'),
  t('math-factorial', 'Factorial', 'Compute n! for 0 ≤ n ≤ 170.', 'a non-negative integer', (s) => {
    const n = parseInt(s.trim(), 10); if (isNaN(n) || n < 0 || n > 170) return 'Enter an integer 0-170.';
    let r = 1; for (let i = 2; i <= n; i++) r *= i; return `${n}! = ${r}`;
  }, ['numbertheory'], '10'),
  t('math-fibonacci', 'Fibonacci Sequence', 'First N Fibonacci numbers.', 'count (1-90)', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 10, 1), 90);
    const f = [0, 1]; for (let i = 2; i < n; i++) f.push(f[i - 1] + f[i - 2]);
    return f.slice(0, n).join(', ');
  }, ['sequence'], '15'),
  t('math-prime-check', 'Is Prime?', 'Test whether a number is prime.', 'a positive integer', (s) => {
    const n = parseInt(s.trim(), 10); if (isNaN(n) || n < 1) return 'Enter a positive integer.';
    if (n < 2) return `${n} is not prime.`;
    for (let i = 2; i <= Math.sqrt(n); i++) if (n % i === 0) return `${n} is not prime (divisible by ${i}).`;
    return `${n} is prime.`;
  }, ['numbertheory'], '97'),
  t('math-prime-factors', 'Prime Factorization', 'Factor a number into primes.', 'an integer > 1', (s) => {
    let n = parseInt(s.trim(), 10); if (isNaN(n) || n < 2) return 'Enter an integer > 1.';
    const factors: number[] = [];
    for (let d = 2; d * d <= n; d++) while (n % d === 0) { factors.push(d); n /= d; }
    if (n > 1) factors.push(n);
    return `${s.trim()} = ${factors.join(' × ')}`;
  }, ['numbertheory'], '360'),
  t('math-primes-upto', 'Primes Up To N', 'List primes up to N (Sieve of Eratosthenes).', 'an integer (max 10000)', (s) => {
    const n = Math.min(parseInt(s) || 100, 10000); if (n < 2) return 'Enter an integer ≥ 2.';
    const sieve = new Array(n + 1).fill(true); sieve[0] = sieve[1] = false;
    for (let i = 2; i * i <= n; i++) if (sieve[i]) for (let j = i * i; j <= n; j += i) sieve[j] = false;
    const primes = []; for (let i = 2; i <= n; i++) if (sieve[i]) primes.push(i);
    return `${primes.length} primes ≤ ${n}:\n${primes.join(', ')}`;
  }, ['numbertheory'], '100'),
  t('math-gcd', 'GCD', 'Greatest common divisor of a list of integers.', 'space/comma separated integers', (s) => {
    const arr = nums(s).map(Math.round); if (arr.length < 2) return 'Enter at least two integers.';
    return `gcd(${arr.join(', ')}) = ${arr.reduce((a, b) => gcd(a, b))}`;
  }, ['numbertheory'], '48 36 60'),
  t('math-lcm', 'LCM', 'Least common multiple of a list of integers.', 'space/comma separated integers', (s) => {
    const arr = nums(s).map(Math.round); if (arr.length < 2) return 'Enter at least two integers.';
    return `lcm(${arr.join(', ')}) = ${arr.reduce((a, b) => Math.abs(a * b) / gcd(a, b))}`;
  }, ['numbertheory'], '4 6 8'),
  t('math-mean', 'Mean (Average)', 'Arithmetic mean of numbers.', 'space/comma separated numbers', (s) => {
    const a = nums(s); if (!a.length) return 'Enter numbers.'; return `mean = ${a.reduce((x, y) => x + y, 0) / a.length}`;
  }, ['stats'], '4 8 15 16 23 42'),
  t('math-median', 'Median', 'Middle value of a sorted list.', 'space/comma separated numbers', (s) => {
    const a = nums(s).sort((x, y) => x - y); if (!a.length) return 'Enter numbers.';
    const m = Math.floor(a.length / 2); return `median = ${a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2}`;
  }, ['stats'], '4 8 15 16 23 42'),
  t('math-mode', 'Mode', 'Most frequent value(s).', 'space/comma separated numbers', (s) => {
    const a = nums(s); if (!a.length) return 'Enter numbers.';
    const c = new Map<number, number>(); a.forEach((n) => c.set(n, (c.get(n) || 0) + 1));
    const max = Math.max(...c.values());
    return `mode = ${[...c.entries()].filter(([, v]) => v === max).map(([k]) => k).join(', ')} (×${max})`;
  }, ['stats'], '1 2 2 3 3 3 4'),
  t('math-stddev', 'Standard Deviation', 'Population mean, variance, and σ.', 'space/comma separated numbers', (s) => {
    const a = nums(s); if (a.length < 2) return 'Enter at least two numbers.';
    const mean = a.reduce((x, y) => x + y, 0) / a.length;
    const variance = a.reduce((x, y) => x + (y - mean) ** 2, 0) / a.length;
    return `mean = ${Math.round(mean * 1e4) / 1e4}\nvariance = ${Math.round(variance * 1e4) / 1e4}\nσ = ${Math.round(Math.sqrt(variance) * 1e4) / 1e4}`;
  }, ['stats'], '2 4 4 4 5 5 7 9'),
  t('math-sum', 'Sum & Product', 'Sum, product, min, max, count of a list.', 'space/comma separated numbers', (s) => {
    const a = nums(s); if (!a.length) return 'Enter numbers.';
    return `count = ${a.length}\nsum = ${a.reduce((x, y) => x + y, 0)}\nproduct = ${a.reduce((x, y) => x * y, 1)}\nmin = ${Math.min(...a)}\nmax = ${Math.max(...a)}`;
  }, ['stats'], '5 10 15 20'),
  t('math-quadratic', 'Quadratic Solver', 'Solve ax²+bx+c=0. Format: a::b::c', 'a::b::c', (s) => {
    const [a, b, c] = s.split('::').map(Number); if ([a, b, c].some(isNaN) || a === 0) return 'Format: a::b::c  (a ≠ 0, e.g. 1::-3::2)';
    const disc = b * b - 4 * a * c;
    if (disc < 0) { const re = -b / (2 * a), im = Math.sqrt(-disc) / (2 * a); return `Complex roots: ${re} ± ${Math.round(im * 1e4) / 1e4}i`; }
    const sq = Math.sqrt(disc);
    return `x₁ = ${(-b + sq) / (2 * a)}\nx₂ = ${(-b - sq) / (2 * a)}`;
  }, ['algebra'], '1::-3::2'),
  t('math-ncr', 'Combinations (nCr)', 'Number of ways to choose r from n. Format: n::r', 'n::r', (s) => {
    const [n, r] = s.split('::').map(Number); if (isNaN(n) || isNaN(r) || r > n || n < 0 || r < 0) return 'Format: n::r  (0 ≤ r ≤ n)';
    let res = 1; for (let i = 0; i < r; i++) res = res * (n - i) / (i + 1);
    return `C(${n},${r}) = ${Math.round(res)}`;
  }, ['combinatorics'], '52::5'),
  t('math-npr', 'Permutations (nPr)', 'Number of ordered arrangements. Format: n::r', 'n::r', (s) => {
    const [n, r] = s.split('::').map(Number); if (isNaN(n) || isNaN(r) || r > n || n < 0 || r < 0) return 'Format: n::r  (0 ≤ r ≤ n)';
    let res = 1; for (let i = 0; i < r; i++) res *= n - i;
    return `P(${n},${r}) = ${res}`;
  }, ['combinatorics'], '10::3'),
  t('math-round', 'Round / Floor / Ceil', 'Show rounding variants of a number.', 'a number', (s) => {
    const v = parseFloat(s); if (isNaN(v)) return 'Enter a number.';
    return `round = ${Math.round(v)}\nfloor = ${Math.floor(v)}\nceil = ${Math.ceil(v)}\ntrunc = ${Math.trunc(v)}`;
  }, ['calc'], '3.7'),
  t('math-nth-root', 'Nth Root', 'Compute the nth root. Format: value::n', 'value::n', (s) => {
    const [v, n] = s.split('::').map(Number); if (isNaN(v) || isNaN(n) || n === 0) return 'Format: value::n  (e.g. 27::3)';
    const r = Math.sign(v) * Math.pow(Math.abs(v), 1 / n);
    return `${n}√${v} = ${Math.round(r * 1e8) / 1e8}`;
  }, ['calc'], '27::3'),
  t('math-log', 'Logarithm', 'Log of value in a base. Format: value::base (base default e)', 'value or value::base', (s) => {
    const [v, b] = s.split('::').map((x) => parseFloat(x.trim()));
    if (isNaN(v) || v <= 0) return 'Enter a positive value. Format: value::base';
    if (isNaN(b)) return `ln(${v}) = ${Math.round(Math.log(v) * 1e8) / 1e8}`;
    return `log_${b}(${v}) = ${Math.round((Math.log(v) / Math.log(b)) * 1e8) / 1e8}`;
  }, ['calc'], '1000::10'),
  t('math-tip', 'Tip Calculator', 'Split a bill with tip. Format: bill::tip%::people', 'bill::tip::people', (s) => {
    const [bill, tip, people] = s.split('::').map(Number);
    if (isNaN(bill) || isNaN(tip)) return 'Format: bill::tipPercent::people  (e.g. 84.50::18::4)';
    const p = people && people > 0 ? people : 1;
    const tipAmt = bill * tip / 100, total = bill + tipAmt;
    return `Tip (${tip}%): $${tipAmt.toFixed(2)}\nTotal: $${total.toFixed(2)}\nPer person (${p}): $${(total / p).toFixed(2)}`;
  }, ['finance'], '84.50::18::4'),
  t('math-ratio-simplify', 'Simplify Ratio', 'Reduce a ratio to lowest terms. Format: a::b', 'a::b', (s) => {
    const [a, b] = s.split('::').map((x) => Math.round(Number(x))); if (isNaN(a) || isNaN(b) || !b) return 'Format: a::b  (e.g. 1920::1080)';
    const g = gcd(a, b); return `${a}:${b} = ${a / g}:${b / g}`;
  }, ['ratio'], '1920::1080'),
  t('math-number-to-words', 'Number → Words', 'Spell an integer in English (|value| < 1e12).', 'an integer', (s) => {
    let n = parseInt(s.replace(/[,\s]/g, ''), 10);
    if (isNaN(n)) return 'Enter an integer.';
    if (n === 0) return 'zero';
    const neg = n < 0; n = Math.abs(n);
    if (n >= 1e12) return 'Number too large (max ~1 trillion).';
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const chunk = (x: number): string => {
      let str = '';
      if (x >= 100) { str += ones[Math.floor(x / 100)] + ' hundred'; x %= 100; if (x) str += ' '; }
      if (x >= 20) { str += tens[Math.floor(x / 10)]; if (x % 10) str += '-' + ones[x % 10]; }
      else if (x > 0) str += ones[x];
      return str;
    };
    const scales = ['', ' thousand', ' million', ' billion'];
    const parts: string[] = []; let i = 0;
    while (n > 0) { const c = n % 1000; if (c) parts.unshift(chunk(c) + scales[i]); n = Math.floor(n / 1000); i++; }
    return (neg ? 'negative ' : '') + parts.join(', ');
  }, ['format'], '1234567'),
  t('math-random-number', 'Random Number', 'A random number in a range. Format: min::max', 'min::max', (s) => {
    const [lo, hi] = s.split('::').map(Number); if (isNaN(lo) || isNaN(hi) || hi < lo) return 'Format: min::max  (e.g. 1::100)';
    return String(Math.floor(Math.random() * (hi - lo + 1)) + lo);
  }, ['random'], '1::100'),
  t('math-dice', 'Dice Roller', 'Roll dice in NdM notation (e.g. 3d6, 1d20).', 'NdM', (s) => {
    const m = s.trim().toLowerCase().match(/^(\d+)d(\d+)$/); if (!m) return 'Format: NdM  (e.g. 3d6, 1d20)';
    const [n, sides] = [parseInt(m[1]), parseInt(m[2])];
    if (n < 1 || n > 100 || sides < 2 || sides > 1000) return 'Use 1-100 dice with 2-1000 sides.';
    const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * sides) + 1);
    return `Rolls: ${rolls.join(', ')}\nTotal: ${rolls.reduce((a, b) => a + b, 0)}`;
  }, ['random'], '3d6'),
  t('math-sort-trace', 'Sorting Visualizer', 'Bubble-sort a list step by step (educational trace, max 12 items).', 'numbers', (s) => {
    const nums = (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    if (nums.length < 2) return 'Enter at least two numbers.';
    if (nums.length > 12) return `Too many (${nums.length}) — trace is readable up to 12 items.`;
    const a = [...nums];
    const steps: string[] = [`start: [${a.join(', ')}]`];
    for (let pass = 0; pass < a.length - 1; pass++) {
      let swapped = false;
      for (let i = 0; i < a.length - 1 - pass; i++) {
        if (a[i] > a[i + 1]) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; swapped = true; steps.push(`swap ${a[i + 1]}↔${a[i]}: [${a.join(', ')}]`); }
      }
      if (!swapped) { steps.push(`pass ${pass + 1}: no swaps — done early`); break; }
    }
    steps.push(`sorted: [${a.join(', ')}]`);
    return steps.join('\n');
  }, ['sort', 'educational'], '5 2 9 1 7'),
];
