/**
 * Developer Tools pack — JSON/CSV/query formatting, JWT decode, regex, diff.
 * All pure and offline.
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
  id, name, description, category: 'dev', tags: ['dev', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const b64urlDecode = (s: string): string => {
  let x = s.replace(/-/g, '+').replace(/_/g, '/');
  while (x.length % 4) x += '=';
  return decodeURIComponent([...atob(x)].map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
};

export const devPack: ToolboxTool[] = [
  t('dev-json-format', 'JSON Pretty Print', 'Format and validate JSON with 2-space indent.', 'JSON text', (s) => {
    try { return JSON.stringify(JSON.parse(s), null, 2); } catch (e) { return `Invalid JSON: ${(e as Error).message}`; }
  }, ['json'], '{"a":1,"b":[2,3]}'),
  t('dev-json-minify', 'JSON Minify', 'Strip whitespace from JSON.', 'JSON text', (s) => {
    try { return JSON.stringify(JSON.parse(s)); } catch (e) { return `Invalid JSON: ${(e as Error).message}`; }
  }, ['json']),
  t('dev-json-sort-keys', 'JSON Sort Keys', 'Recursively sort object keys alphabetically.', 'JSON text', (s) => {
    try {
      const sort = (v: any): any => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])])) : v;
      return JSON.stringify(sort(JSON.parse(s)), null, 2);
    } catch (e) { return `Invalid JSON: ${(e as Error).message}`; }
  }, ['json']),
  t('dev-json-validate', 'JSON Validate', 'Check whether text is valid JSON and report the error.', 'JSON text', (s) => {
    try { JSON.parse(s); return 'Valid JSON ✓'; } catch (e) { return `Invalid: ${(e as Error).message}`; }
  }, ['json']),
  t('dev-json-to-query', 'JSON → Query String', 'Convert a flat JSON object to a URL query string.', 'flat JSON object', (s) => {
    try {
      const o = JSON.parse(s); if (typeof o !== 'object' || Array.isArray(o)) return 'Provide a flat JSON object.';
      return new URLSearchParams(Object.entries(o).map(([k, v]) => [k, String(v)])).toString();
    } catch (e) { return `Invalid JSON: ${(e as Error).message}`; }
  }, ['json', 'url'], '{"page":2,"q":"hello world"}'),
  t('dev-query-to-json', 'Query String → JSON', 'Parse a URL query string into JSON.', 'a=1&b=two', (s) => {
    const p = new URLSearchParams(s.replace(/^\?/, ''));
    const o: Record<string, string> = {}; p.forEach((v, k) => (o[k] = v));
    return JSON.stringify(o, null, 2);
  }, ['json', 'url'], 'page=2&q=hello%20world'),
  t('dev-csv-to-json', 'CSV → JSON', 'Convert CSV (first row = headers) to a JSON array.', 'CSV text', (s) => {
    const rows = s.trim().split(/\r?\n/).map((r) => r.split(','));
    if (rows.length < 2) return 'Provide a header row plus at least one data row.';
    const headers = rows[0].map((h) => h.trim());
    return JSON.stringify(rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()]))), null, 2);
  }, ['csv', 'json'], 'name,age\nada,36\nalan,41'),
  t('dev-json-to-csv', 'JSON → CSV', 'Convert a JSON array of objects to CSV.', 'JSON array', (s) => {
    try {
      const arr = JSON.parse(s); if (!Array.isArray(arr) || !arr.length) return 'Provide a non-empty JSON array of objects.';
      const headers = [...new Set(arr.flatMap((o: any) => Object.keys(o)))];
      const esc = (v: any) => { const str = v == null ? '' : String(v); return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str; };
      return [headers.join(','), ...arr.map((o: any) => headers.map((h) => esc(o[h])).join(','))].join('\n');
    } catch (e) { return `Invalid JSON: ${(e as Error).message}`; }
  }, ['csv', 'json']),
  t('dev-jwt-decode', 'JWT Decoder', 'Decode a JWT header and payload (no signature verification).', 'a JWT', (s) => {
    const parts = s.trim().split('.'); if (parts.length < 2) return 'Not a JWT (expected header.payload.signature).';
    try {
      const header = JSON.parse(b64urlDecode(parts[0]));
      const payload = JSON.parse(b64urlDecode(parts[1]));
      let extra = '';
      if (payload.exp) extra += `\n\nexp: ${new Date(payload.exp * 1000).toISOString()} (${payload.exp * 1000 < Date.now() ? 'EXPIRED' : 'valid'})`;
      if (payload.iat) extra += `\niat: ${new Date(payload.iat * 1000).toISOString()}`;
      return `HEADER:\n${JSON.stringify(header, null, 2)}\n\nPAYLOAD:\n${JSON.stringify(payload, null, 2)}${extra}\n\n⚠ Signature not verified (offline decode only).`;
    } catch { return 'Could not decode — malformed Base64URL segments.'; }
  }, ['jwt'], 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWRhIn0.abc'),
  t('dev-regex-test', 'Regex Tester', 'Test a pattern against text. Format: /pattern/flags::text', '/pattern/flags::text', (s) => {
    const sep = s.indexOf('::'); if (sep < 0) return 'Format: /pattern/flags::text  (e.g. /\\d+/g::a1 b22 c333)';
    const rx = s.slice(0, sep).trim(); const text = s.slice(sep + 2);
    const m = rx.match(/^\/(.*)\/([gimsuy]*)$/); if (!m) return 'Wrap the pattern in slashes: /pattern/flags';
    try {
      const re = new RegExp(m[1], m[2].includes('g') ? m[2] : m[2] + 'g');
      const matches = [...text.matchAll(re)];
      if (!matches.length) return 'No matches.';
      return `${matches.length} match(es):\n` + matches.map((mm, i) => `${i + 1}. "${mm[0]}" @ index ${mm.index}${mm.length > 1 ? ` [groups: ${mm.slice(1).map((g) => JSON.stringify(g)).join(', ')}]` : ''}`).join('\n');
    } catch (e) { return `Invalid regex: ${(e as Error).message}`; }
  }, ['regex'], '/\\d+/g::a1 b22 c333'),
  t('dev-regex-escape', 'Regex Escape', 'Escape regex metacharacters in a literal string.', 'any text', (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ['regex'], 'a.b*c(d)'),
  t('dev-html-preview-escape', 'Escape for HTML Attribute', 'Escape a value for safe use in an HTML attribute.', 'any text', (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\n/g, '&#10;'), ['html']),
  t('dev-lorem', 'Lorem Ipsum', 'Generate N paragraphs of placeholder text.', 'paragraph count (default 3)', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 3, 1), 20);
    const p = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';
    return Array(n).fill(p).join('\n\n');
  }, ['generate'], '2'),
  t('dev-slug-to-title', 'Slug → Title', 'Turn a-slug-like-this into a Title.', 'a-slug', (s) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim(), ['format'], 'my-cool-blog-post'),
  t('dev-css-hex-shorten', 'Shorten CSS Hex', 'Collapse #aabbcc to #abc when possible.', 'a hex color', (s) => {
    const m = s.trim().match(/^#?([0-9a-f]{6})$/i); if (!m) return 'Enter a 6-digit hex color (e.g. #aabbcc).';
    const h = m[1]; return h[0] === h[1] && h[2] === h[3] && h[4] === h[5] ? `#${h[0]}${h[2]}${h[4]}` : `#${h} (cannot shorten)`;
  }, ['css']),
  t('dev-cron-explain', 'Cron Explainer', 'Describe a 5-field cron expression in words.', 'min hr dom mon dow', (s) => {
    const f = s.trim().split(/\s+/); if (f.length !== 5) return 'Provide 5 fields: minute hour day-of-month month day-of-week';
    const [mi, h, dom, mon, dow] = f;
    const p = (v: string, unit: string) => v === '*' ? `every ${unit}` : v.includes('/') ? `every ${v.split('/')[1]} ${unit}s` : `${unit} ${v}`;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dowText = dow === '*' ? 'every day of week' : dow.split(',').map((d) => days[+d % 7] || d).join(', ');
    return `Runs: ${p(mi, 'minute')}, ${p(h, 'hour')}, ${dom === '*' ? 'every day' : 'day-of-month ' + dom}, ${mon === '*' ? 'every month' : 'month ' + mon}, ${dowText}.`;
  }, ['cron'], '*/15 9 * * 1-5'),
  t('dev-user-agent-parse', 'User-Agent Parser', 'Extract browser/OS hints from a UA string.', 'a User-Agent string', (s) => {
    const os = /Windows NT 10/.test(s) ? 'Windows 10/11' : /Mac OS X/.test(s) ? 'macOS' : /Android/.test(s) ? 'Android' : /iPhone|iPad/.test(s) ? 'iOS' : /Linux/.test(s) ? 'Linux' : 'unknown';
    const br = /Edg\//.test(s) ? 'Edge' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : 'unknown';
    const mobile = /Mobile|Android|iPhone/.test(s) ? 'Mobile' : 'Desktop';
    return `OS: ${os}\nBrowser: ${br}\nForm factor: ${mobile}`;
  }, ['web'], 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0'),
  t('dev-indent-2to4', 'Reindent 2 → 4 Spaces', 'Double the leading-space indentation of each line.', 'indented code', (s) => s.split('\n').map((l) => { const m = l.match(/^( *)/)![1]; return ' '.repeat(m.length * 2) + l.slice(m.length); }).join('\n'), ['format']),
  t('dev-tabs-to-spaces', 'Tabs → Spaces', 'Replace leading tabs with 4 spaces each.', 'code with tabs', (s) => s.split('\n').map((l) => l.replace(/^\t+/, (t) => '    '.repeat(t.length))).join('\n'), ['format']),
  t('dev-semver-compare', 'Semver Compare', 'Compare two semantic versions. Format: v1::v2', 'v1::v2', (s) => {
    const [a, b] = s.split('::').map((x) => x.trim().replace(/^v/, ''));
    if (!a || !b) return 'Format: v1::v2  (e.g. 1.2.0::1.10.3)';
    const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return `${a} ${d > 0 ? '>' : '<'} ${b}`; }
    return `${a} = ${b}`;
  }, ['version'], '1.2.0::1.10.3'),
  t('dev-diff', 'Text Diff', 'Line diff of two texts separated by a ==== line. -/+ markers, LCS-based.', 'old\n====\nnew', (s) => {
    const parts = s.split(/\r?\n====+\r?\n/);
    if (parts.length !== 2) return 'Separate the two texts with a line of ==== (at least four equals signs).';
    const A = parts[0].split(/\r?\n/), B = parts[1].split(/\r?\n/);
    if (A.length * B.length > 250000) return 'Texts too large to diff here (keep under ~500 lines each).';
    const dp: number[][] = Array.from({ length: A.length + 1 }, () => new Array(B.length + 1).fill(0));
    for (let i = A.length - 1; i >= 0; i--)
      for (let j = B.length - 1; j >= 0; j--)
        dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const out: string[] = [];
    let i = 0, j = 0, changes = 0;
    while (i < A.length && j < B.length) {
      if (A[i] === B[j]) { out.push(`  ${A[i]}`); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push(`- ${A[i]}`); i++; changes++; }
      else { out.push(`+ ${B[j]}`); j++; changes++; }
    }
    while (i < A.length) { out.push(`- ${A[i++]}`); changes++; }
    while (j < B.length) { out.push(`+ ${B[j++]}`); changes++; }
    return changes === 0 ? 'Texts are identical.' : `${changes} changed line(s):\n${out.join('\n')}`;
  }, ['diff', 'compare'], 'the cat\nsat here\n====\nthe cat\nsat there'),
  t('dev-jsonpath', 'JSON Path Query', 'Extract a value: $.users[0].name style path. Format: path::json', 'path::json', (s) => {
    const idx = s.indexOf('::');
    if (idx < 0) return 'Format: $.users[0].name::{"users":[{"name":"ada"}]}';
    const path = s.slice(0, idx).trim();
    let value: unknown;
    try { value = JSON.parse(s.slice(idx + 2)); } catch (e) { return `Invalid JSON: ${(e as Error).message}`; }
    if (!path.startsWith('$')) return 'Path must start with $ (e.g. $.a.b[0]).';
    const tokens = path.slice(1).match(/\.[A-Za-z_$][\w$]*|\[\d+\]|\["[^"]*"\]/g) ?? [];
    const consumed = tokens.join('');
    if (consumed !== path.slice(1)) return `Cannot parse path near: ${path.slice(1 + consumed.length)}`;
    for (const tok of tokens) {
      if (value === null || value === undefined) return `Path hit ${value === null ? 'null' : 'undefined'} before ${tok}`;
      const key = tok.startsWith('.') ? tok.slice(1) : tok.startsWith('["') ? tok.slice(2, -2) : Number(tok.slice(1, -1));
      value = (value as Record<string | number, unknown>)[key as string | number];
    }
    return value === undefined ? '(no value at that path)' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  }, ['json', 'query'], '$.users[0].name::{"users":[{"name":"ada"},{"name":"alan"}]}'),
  t('dev-template', 'Template Fill', 'Substitute {{name}} slots. Format: template::key=value; key=value', 'template::k=v; k=v', (s) => {
    const idx = s.lastIndexOf('::');
    if (idx < 0) return 'Format: Hello {{name}}, you are {{age}}::name=Ada; age=36';
    const template = s.slice(0, idx);
    const vars: Record<string, string> = {};
    s.slice(idx + 2).split(/[;\n]/).forEach((pair) => {
      const m = pair.match(/^\s*([\w.-]+)\s*=\s*(.*)$/);
      if (m) vars[m[1]] = m[2].trim();
    });
    if (!Object.keys(vars).length) return 'No variables found after :: (use key=value; key=value).';
    const missing = new Set<string>();
    const filled = template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, name: string) => {
      if (name in vars) return vars[name];
      missing.add(name);
      return `{{${name}}}`;
    });
    return missing.size ? `${filled}\n\n(unfilled: ${[...missing].join(', ')})` : filled;
  }, ['template', 'merge'], 'Hello {{name}}, you are {{age}}::name=Ada; age=36'),
  t('dev-sql-format', 'SQL Formatter', 'Pretty-print SQL: uppercase keywords, one clause per line.', 'SQL statement', (s) => {
    if (!s.trim()) return 'Paste a SQL statement.';
    const KW = ['select', 'from', 'where', 'left join', 'right join', 'inner join', 'outer join', 'full join', 'join', 'group by', 'order by', 'having', 'limit', 'offset', 'union all', 'union', 'insert into', 'values', 'update', 'set', 'delete from', 'on', 'and', 'or', 'as', 'in', 'not', 'null', 'is', 'like', 'between', 'case', 'when', 'then', 'else', 'end', 'distinct', 'count', 'sum', 'avg', 'min', 'max'];
    const NEWLINE_BEFORE = ['from', 'where', 'left join', 'right join', 'inner join', 'outer join', 'full join', 'join', 'group by', 'order by', 'having', 'limit', 'offset', 'union all', 'union', 'values', 'set'];
    let out = s.replace(/\s+/g, ' ').trim();
    // Uppercase keywords (longest first so "group by" wins over "by")
    [...KW].sort((a, b) => b.length - a.length).forEach((kw) => {
      out = out.replace(new RegExp(`\\b${kw.replace(' ', '\\s+')}\\b`, 'gi'), kw.toUpperCase());
    });
    NEWLINE_BEFORE.forEach((kw) => {
      out = out.replace(new RegExp(`\\s+${kw.toUpperCase().replace(' ', '\\s+')}\\b`, 'g'), `\n${kw.toUpperCase()}`);
    });
    out = out.replace(/\s+(AND|OR)\b/g, '\n  $1');
    return out;
  }, ['sql', 'format'], 'select id, name from users where age > 21 and city = "x" order by name limit 10'),
  t('dev-regex-builder', 'Regex Builder', 'Compose a regex from plain pieces joined by ::. Pieces: starts:x, ends:x, text:x, digits[:n], letters[:n], word, space, any', 'pieces::…', (s) => {
    const pieces = s.split('::').map((p) => p.trim()).filter(Boolean);
    if (!pieces.length) return 'Example: starts:INV-::digits:4::ends:-X  →  ^INV-\\d{4}.*-X$';
    const escape = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let prefix = '', suffix = '', body = '';
    const notes: string[] = [];
    for (const piece of pieces) {
      const [op, ...rest] = piece.split(':');
      const arg = rest.join(':');
      switch (op.toLowerCase()) {
        case 'starts': prefix = '^' + escape(arg); notes.push(`starts with "${arg}"`); break;
        case 'ends': suffix = escape(arg) + '$'; notes.push(`ends with "${arg}"`); break;
        case 'text': body += escape(arg); notes.push(`literal "${arg}"`); break;
        case 'digits': body += arg ? `\\d{${parseInt(arg) || 1}}` : '\\d+'; notes.push(arg ? `exactly ${arg} digit(s)` : 'one or more digits'); break;
        case 'letters': body += arg ? `[A-Za-z]{${parseInt(arg) || 1}}` : '[A-Za-z]+'; notes.push(arg ? `exactly ${arg} letter(s)` : 'one or more letters'); break;
        case 'word': body += '\\w+'; notes.push('a word'); break;
        case 'space': body += '\\s+'; notes.push('whitespace'); break;
        case 'any': body += '.*'; notes.push('anything'); break;
        default: return `Unknown piece "${op}". Use: starts:x, ends:x, text:x, digits[:n], letters[:n], word, space, any`;
      }
    }
    // If there is an ends: piece but nothing anchoring it to the body, allow a gap.
    const gap = suffix && (prefix || body) && !body.endsWith('.*') ? '.*' : '';
    const full = prefix + body + gap + suffix;
    try { new RegExp(full); } catch (e) { return `Built an invalid regex (${(e as Error).message}) — adjust the pieces.`; }
    return `/${full}/\nMeaning: ${notes.join(', then ')}`;
  }, ['regex', 'builder'], 'starts:INV-::digits:4::ends:-X'),
];
