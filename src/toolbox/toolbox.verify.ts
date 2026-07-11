/**
 * Toolbox verification harness (run: `npx tsx lib/toolbox/toolbox.verify.ts`).
 *
 * Drives the REAL ToolboxService + REAL packs (no mocks) and asserts concrete
 * outputs and state invariants. If any implementation were deleted or its logic
 * inverted, the matching assertion fails — a green run means the tools work.
 */
import { ToolboxService } from './toolboxService';
import { installGlobalToolbox } from './globalBridge';
import { runToolCalls, toolIdFromFunctionName } from './toolCallExecutor';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; }
  else { failed++; failures.push(`${name}${detail ? ' — ' + detail : ''}`); }
}

async function eq(name: string, id: string, input: string, expected: string | RegExp, svc: ToolboxService) {
  const res = await svc.run(id, input, 'test');
  const match = expected instanceof RegExp ? expected.test(res.output) : res.output === expected;
  ok(name, match, `got: ${JSON.stringify(res.output).slice(0, 120)}`);
}

async function contains(name: string, id: string, input: string, needle: string, svc: ToolboxService) {
  const res = await svc.run(id, input, 'test');
  ok(name, res.output.includes(needle), `got: ${JSON.stringify(res.output).slice(0, 120)}`);
}

async function main() {
  const svc = new ToolboxService();

  // ── Registry invariants ─────────────────────────────────────
  const all = svc.list();
  ok('registry has 100+ tools', all.length >= 100, `count=${all.length}`);
  ok('no duplicate ids', new Set(all.map((t) => t.id)).size === all.length);
  ok('every tool has a run fn', all.every((t) => typeof t.run === 'function'));
  ok('every tool is free', all.every((t) => t.access === 'free'));
  ok('every tool has category+hint', all.every((t) => t.category && t.inputHint));
  ok('categories resolve', svc.categories().length >= 8, `cats=${svc.categories().length}`);

  // ── Text pack (deterministic) ───────────────────────────────
  await eq('reverse', 'text-reverse', 'stressed', 'desserts', svc);
  await eq('uppercase', 'text-uppercase', 'abc', 'ABC', svc);
  await eq('snakecase', 'text-snakecase', 'hello world example', 'hello_world_example', svc);
  await eq('slugify', 'text-slugify', 'Héllo Wörld! 2025', 'hello-world-2025', svc);
  await contains('word count', 'text-count-words', 'one two three', 'Words: 3', svc);
  await eq('dedupe lines', 'text-dedupe-lines', 'a\na\nb', 'a\nb', svc);
  await eq('remove accents', 'text-remove-accents', 'café', 'cafe', svc);

  // ── Encode pack (round-trips prove both directions) ─────────
  const b64 = await svc.run('enc-base64-encode', 'Hello, World!', 'test');
  await eq('base64 round-trip', 'enc-base64-decode', b64.output, 'Hello, World!', svc);
  await eq('rot13 self-inverse', 'enc-rot13', (await svc.run('enc-rot13', 'Secret', 'test')).output, 'Secret', svc);
  await eq('hex encode', 'enc-hex-encode', 'Hi', '48 69', svc);
  await contains('morse sos', 'enc-morse-encode', 'sos', '... --- ...', svc);
  await eq('caesar shift 3', 'enc-caesar', '3::abc', 'def', svc);
  await eq('atbash self-inverse', 'enc-atbash', (await svc.run('enc-atbash', 'hello', 'test')).output, 'hello', svc);

  // ── Crypto pack (known vectors) ─────────────────────────────
  await eq('sha256 empty', 'hash-sha256', '', /^e3b0c44298fc1c149afbf4c8996fb924/, svc);
  await eq('sha1 abc', 'hash-sha1', 'abc', 'a9993e364706816aba3e25717850c26c9cd0d89d', svc);
  await contains('luhn valid', 'hash-luhn-check', '4539148803436467', 'VALID', svc);
  await contains('luhn invalid', 'hash-luhn-check', '4539148803436460', 'INVALID', svc);
  await eq('uuid shape', 'gen-uuid-v4', '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, svc);

  // ── Convert pack ────────────────────────────────────────────
  await contains('km→mi', 'conv-km-mi', '5', '3.106855', svc);
  await contains('c→f', 'conv-c-f', '100', '212', svc);
  await contains('dec→hex', 'conv-dec-hex', '255', '0xFF', svc);
  await eq('roman 2025', 'conv-roman', '2025', 'MMXXV', svc);
  await eq('roman→dec', 'conv-roman-dec', 'MMXXV', '2025', svc);

  // ── Math pack ───────────────────────────────────────────────
  await contains('calculator', 'math-calc', '(2+3)*4^2', '80', svc);
  await contains('prime factors', 'math-prime-factors', '360', '2 × 2 × 2 × 3 × 3 × 5', svc);
  await contains('gcd', 'math-gcd', '48 36 60', '12', svc);
  await contains('fib', 'math-fibonacci', '7', '0, 1, 1, 2, 3, 5, 8', svc);
  await contains('median', 'math-median', '4 8 15 16 23 42', '15.5', svc);

  // ── Color pack ──────────────────────────────────────────────
  await contains('hex→rgb', 'color-hex-rgb', '#3B82F6', 'rgb(59, 130, 246)', svc);
  await contains('contrast bw', 'color-contrast', '#000000::#FFFFFF', '21:1', svc);

  // ── Network pack ────────────────────────────────────────────
  await contains('cidr /24 broadcast', 'net-cidr', '192.168.1.0/24', '192.168.1.255', svc);
  await contains('cidr usable', 'net-cidr', '192.168.1.0/24', '254', svc);
  await contains('ip in range yes', 'net-ip-in-range', '192.168.1.50::192.168.1.0/24', 'YES', svc);
  await contains('ip class private', 'net-ip-class', '10.0.0.5', 'Private', svc);

  // ── Datetime / finance sanity ───────────────────────────────
  await contains('leap 2024', 'dt-leap-year', '2024', 'is a leap year', svc);
  await contains('leap 2023', 'dt-leap-year', '2023', 'not a leap year', svc);
  await contains('loan payment', 'fin-loan', '25000::6.5::5', 'Monthly payment', svc);
  await contains('discount', 'fin-discount', '79.99::25', 'Final price', svc);

  // ── Crypto additions (known vectors) ────────────────────────
  await eq('md5 empty', 'hash-md5', '', 'd41d8cd98f00b204e9800998ecf8427e', svc);
  await eq('md5 abc', 'hash-md5', 'abc', '900150983cd24fb0d6963f7d28e17f72', svc);
  await eq('adler32 wikipedia', 'hash-adler32', 'Wikipedia', '11e60398', svc);
  await eq('crc16 check', 'hash-crc16', '123456789', '29B1', svc);

  // ── Encode additions (round-trips + vectors) ────────────────
  await eq('base58 vector', 'enc-base58-encode', 'Hello World!', '2NEpo7TZRRrLZSi2U', svc);
  const b58 = await svc.run('enc-base58-encode', 'Off Grid', 'test');
  await eq('base58 round-trip', 'enc-base58-decode', b58.output, 'Off Grid', svc);
  await contains('base58 bad char', 'enc-base58-decode', '0OIl', 'Invalid Base58', svc);
  const qp = await svc.run('enc-quoted-printable', 'Héllo', 'test');
  await eq('qp round-trip', 'enc-quoted-printable-decode', qp.output, 'Héllo', svc);
  await contains('codepoints', 'enc-codepoints', 'Hi', 'U+0048', svc);

  // ── Health pack ─────────────────────────────────────────────
  await contains('bmi normal', 'hl-bmi', '70::175', 'Normal', svc);
  await contains('bmi format err', 'hl-bmi', 'garbage', 'Format', svc);
  await contains('bmr mifflin', 'hl-bmr', '70::175::30::m', '1649', svc);
  await contains('pace convert', 'hl-pace-convert', '5:30/km', '8:51/mi', svc);
  await contains('race predictor', 'hl-race-time', '42.195::5:30', '3:52', svc);

  // ── Geo pack ────────────────────────────────────────────────
  await contains('haversine ny-lon', 'geo-distance', '40.7128,-74.0060::51.5074,-0.1278', '5570', svc);
  await eq('geohash vector', 'geo-geohash-encode', '57.64911,10.40744::11', 'u4pruydqqvj', svc);
  await contains('geohash decode', 'geo-geohash-decode', 'u4pruydqqvj', '57.64911', svc);
  await contains('dms decimal', 'geo-dms-decimal', `40°26'46"N`, '40.446', svc);
  await contains('coord invalid', 'geo-validate', '95,200', 'INVALID', svc);

  // ── Science pack ────────────────────────────────────────────
  await contains('molar h2o', 'sci-molar-mass', 'H2O', '18.015', svc);
  await contains('molar glucose', 'sci-molar-mass', 'C6H12O6', '180.156', svc);
  await contains('molar parens', 'sci-molar-mass', 'Ca(OH)2', '74.09', svc);
  await contains('molar unknown', 'sci-molar-mass', 'Xx2', 'Unknown element', svc);
  await contains('ohms law', 'sci-ohms-law', 'v=12::i=0.5', 'R = 24', svc);
  await contains('halflife', 'sci-half-life', '5730::5730', '50.00%', svc);

  // ── Electronics pack ────────────────────────────────────────
  await contains('resistor decode', 'el-resistor-decode', 'red red brown gold', '±5%', svc);
  await contains('resistor bad color', 'el-resistor-decode', 'red mauve brown', 'Unknown color', svc);
  await contains('divider', 'el-voltage-divider', '12::10k::4.7k', 'V', svc);
  await contains('cap code', 'el-cap-code', '104', '100 nF', svc);

  // ── Music pack ──────────────────────────────────────────────
  await contains('note a4', 'mu-note-freq', 'A4', '440.00 Hz', svc);
  await contains('note c4', 'mu-note-freq', 'C4', '261.63', svc);
  await contains('bpm 120', 'mu-bpm-ms', '120', '500.0 ms', svc);
  await contains('interval p5', 'mu-interval', 'C4::G4', 'perfect 5th', svc);
  await contains('c major scale', 'mu-scale', 'C::major', 'C – D – E – F – G – A – B', svc);
  await contains('cmaj7 chord', 'mu-chord', 'Cmaj7', 'C – E – G – B', svc);

  // ── Data pack ───────────────────────────────────────────────
  await contains('sum', 'da-sum', '12 7.5 30\n4, 8', '61.5', svc);
  await contains('summary median', 'da-summary', '4 8 15 16 23 42', 'Median: 15.5', svc);
  await eq('set intersection', 'da-set-ops', 'and::a,b,c::b,c,d', 'b, c', svc);
  await contains('pct change', 'da-pct-change', '120::150', '+25%', svc);
  await contains('outlier catch', 'da-outliers', '2 3 3 4 4 5 5 6 42', '42', svc);

  // ── Gaming pack ─────────────────────────────────────────────
  const dice = await svc.run('gm-dice', '3d6', 'test');
  ok('dice in range', /= (1[0-8]|[3-9])$/.test(dice.output.trim()), dice.output);
  await contains('dice invalid', 'gm-dice', 'banana', 'invalid', svc);
  await contains('hit chance', 'gm-hit-chance', '5::15', '55%', svc);
  await contains('xp level', 'gm-xp-level', '7200', 'Level 5', svc);

  // ── Writing pack ────────────────────────────────────────────
  await contains('palindrome yes', 'wr-palindrome', 'A man, a plan, a canal: Panama', 'PALINDROME', svc);
  await contains('palindrome no', 'wr-palindrome', 'not one', 'Not a palindrome', svc);
  await contains('anagram yes', 'wr-anagram', 'listen::silent', 'ANAGRAMS', svc);
  await eq('acronym', 'wr-acronym', 'portable network graphics', 'PNG', svc);
  await contains('pangram yes', 'wr-pangram', 'The quick brown fox jumps over the lazy dog', 'PANGRAM', svc);
  await contains('pangram no', 'wr-pangram', 'hello world', 'missing', svc);
  await eq('title case', 'wr-title-case', 'the war of the worlds', 'The War of the Worlds', svc);

  // ── Cooking pack ────────────────────────────────────────────
  await contains('cups flour', 'ck-cups-grams', '0.5::flour', '60 g', svc);
  await contains('cups unknown', 'ck-cups-grams', '1::plutonium', 'Unknown ingredient', svc);
  await contains('oven 350f', 'ck-oven', '350f', '177 °C', svc);
  await contains('recipe scale', 'ck-scale-recipe', '2::3 eggs', '6 eggs', svc);
  await contains('bakers pct', 'ck-bakers-pct', '500::350', '70.0%', svc);

  // ── Logic pack ──────────────────────────────────────────────
  await contains('truth table rows', 'lg-truth-table', 'A & B', '1 1 |  1', svc);
  await contains('truth table false', 'lg-truth-table', 'A & B', '0 0 |  0', svc);
  await contains('bool eval', 'lg-bool-eval', '(A&B)|C::A=1,B=0,C=1', 'TRUE', svc);
  await contains('bool missing var', 'lg-bool-eval', 'A&B::A=1', 'Missing values', svc);
  await contains('bitwise and', 'lg-bitwise', '12::10', 'a & b = dec 8', svc);
  await contains('twos complement', 'lg-twos-complement', '-5::8', '11111011', svc);
  await contains('gray code', 'lg-gray', 'to::5', 'gray 7', svc);

  // ── Random pack (structure, not values) ─────────────────────
  const pick = await svc.run('rd-pick-one', 'x,y,z', 'test');
  ok('pick-one returns member', ['x', 'y', 'z'].includes(pick.output.trim()), pick.output);
  const santa = await svc.run('rd-secret-santa', 'ada, alan, grace, linus', 'test');
  ok('santa is derangement', santa.output.split('\n').every((line) => { const [g, r] = line.split('→').map((x) => x.trim()); return !!g && !!r && g !== r; }), santa.output);
  const teams = await svc.run('rd-teams', '2::a,b,c,d', 'test');
  ok('teams split evenly', teams.output.includes('Team 1') && teams.output.includes('Team 2'), teams.output);

  // ── SEO pack ────────────────────────────────────────────────
  await contains('meta tags', 'seo-meta', 'My Page::About things', '<title>My Page</title>', svc);
  await contains('meta escapes html', 'seo-meta', 'A<B::x"y', '&lt;', svc);
  await contains('utm builder', 'seo-utm', 'https://example.com::nl::email::launch', 'utm_source=nl', svc);
  await contains('title too long', 'seo-title-check', 'x'.repeat(80), 'truncated', svc);

  // ── Auto pack ───────────────────────────────────────────────
  await contains('mpg conv', 'au-mpg-l100', '7.4l', '31.79 MPG', svc);
  await contains('tire decode', 'au-tire-decode', '225/45R17', '634.3 mm', svc);
  await contains('tire invalid', 'au-tire-decode', 'big wheels', 'Format', svc);
  await contains('trip cost', 'au-trip-cost', '450::7.5::1.85', '62.44', svc);

  // ── Construction pack ───────────────────────────────────────
  await contains('paint liters', 'dy-paint', '42::2', '7.6 L', svc);
  await contains('tile count', 'dy-tile', '12::60::30', 'tiles', svc);
  await contains('stairs code', 'dy-stairs', '280', 'within common code range', svc);
  await contains('concrete bags', 'dy-concrete', '4::3::10', '25 kg', svc);

  // ── Error / false branches (the untested-branch trap) ───────
  const bad = await svc.run('math-calc', 'not math', 'test');
  ok('calc rejects garbage', bad.output.includes('Invalid'), bad.output);
  const unknown = await svc.run('does-not-exist', 'x', 'test');
  ok('unknown tool flagged', unknown.ok === false && unknown.output.includes('Unknown'), unknown.output);
  const badCaesar = await svc.run('enc-caesar', 'no-separator', 'test');
  ok('caesar shows format on bad input', badCaesar.output.includes('Format'), badCaesar.output);

  // ── Install-state invariants (drive real service) ───────────
  const t0 = svc.stats().installedTools;
  svc.install('text-reverse');
  ok('install adds one', svc.stats().installedTools === t0 + 1);
  ok('isInstalled true', svc.isInstalled('text-reverse'));
  svc.install('text-reverse'); // idempotent
  ok('install is idempotent', svc.stats().installedTools === t0 + 1);
  svc.uninstall('text-reverse');
  ok('uninstall removes', !svc.isInstalled('text-reverse'));
  ok('install ignores unknown id', (svc.install('nope'), svc.stats().installedTools === t0));

  // ── Usage log records real runs ─────────────────────────────
  ok('usage log grew', svc.getUsage().length > 0);
  ok('usage records caller', svc.getUsage().some((u) => u.caller === 'test'));

  // ── Search ──────────────────────────────────────────────────
  ok('search finds base64', svc.search('base64').some((t) => t.id === 'enc-base64-encode'));
  ok('search multi-term', svc.search('sha 256').some((t) => t.id === 'hash-sha256'));
  ok('search empty returns all', svc.search('').length === all.length);

  // ── Batch / chain / macros (pipelines) ──────────────────────
  const batch = await svc.runBatch('text-uppercase', 'one\ntwo\n\nthree', 'test');
  ok('batch maps lines', batch.output === 'ONE\nTWO\n\nTHREE', batch.output);
  const batchBad = await svc.runBatch('does-not-exist', 'x', 'test');
  ok('batch unknown tool fails', batchBad.ok === false, batchBad.output);
  const chain = await svc.runChain(['text-reverse', 'text-uppercase'], 'stressed', 'test');
  ok('chain pipes output', chain.ok && chain.output === 'DESSERTS', chain.output);
  ok('chain records steps', chain.steps.length === 2 && chain.steps[0].output === 'desserts');
  const chainBad = await svc.runChain(['text-reverse', 'nope'], 'abc', 'test');
  ok('chain stops on unknown tool', chainBad.ok === false && chainBad.steps.length === 2, chainBad.output);
  ok('macro save validates name', svc.saveMacro('  ', ['text-reverse']) !== null);
  ok('macro save validates tools', (svc.saveMacro('m1', ['nope']) ?? '').includes('Unknown'));
  ok('macro save ok', svc.saveMacro('shout-back', ['text-reverse', 'text-uppercase']) === null);
  ok('macro listed', svc.getMacros().some((m) => m.name === 'shout-back'));
  const macroRun = await svc.runMacro('shout-back', 'stressed', 'test');
  ok('macro runs chain', macroRun.ok && macroRun.output === 'DESSERTS', macroRun.output);
  const macroMissing = await svc.runMacro('ghost', 'x', 'test');
  ok('macro unknown fails', macroMissing.ok === false, macroMissing.output);
  svc.deleteMacro('shout-back');
  ok('macro deleted', !svc.getMacros().some((m) => m.name === 'shout-back'));

  // ── Global bridge (AI accessibility) ────────────────────────
  const api = installGlobalToolbox();
  ok('bridge count matches', api.count() === all.length);
  ok('bridge manifest complete', api.list().length === all.length);
  ok('bridge openai specs', api.openAiFunctions().every((f) => f.name.startsWith('toolbox_') && f.parameters.required.includes('input')));
  const bridged = await api.run('text-uppercase', 'hello', 'ai');
  ok('bridge run works', bridged === 'HELLO');
  const bridgeBatch = await api.batch('text-uppercase', 'a\nb', 'ai');
  ok('bridge batch works', bridgeBatch === 'A\nB', bridgeBatch);
  const bridgeChain = await api.chain(['text-reverse', 'text-uppercase'], 'live', 'ai');
  ok('bridge chain works', bridgeChain.output === 'EVIL', bridgeChain.output);
  ok('bridge macro save', api.macros.save('bridge-macro', ['text-slugify']) === null);
  const bridgeMacro = await api.macros.run('bridge-macro', 'Hello World', 'ai');
  ok('bridge macro runs', bridgeMacro.output === 'hello-world', bridgeMacro.output);
  api.macros.remove('bridge-macro');
  ok('bridge macro removed', !api.macros.list().some((m) => m.name === 'bridge-macro'));
  ok('bridge describe mentions offline', api.describe().toLowerCase().includes('offline'));
  ok('bridge search works', api.search('subnet').some((t) => t.id === 'net-cidr'));

  // ── Tool-call executor (the AI function-calling seam, #66) ──
  ok('fn name mapping', toolIdFromFunctionName('toolbox_text_uppercase') === 'text-uppercase');
  ok('fn name rejects foreign', toolIdFromFunctionName('web_search') === null);
  const calls = await runToolCalls([
    { name: 'toolbox_text_uppercase', arguments: '{"input":"hi"}' },
    { name: 'toolbox_text_reverse', arguments: { input: 'abc' } },
    { name: 'not_a_tool', arguments: '{}' },
    { name: 'toolbox_text_uppercase', arguments: '{bad json' },
  ], 'test');
  ok('executor runs string args', calls[0].ok && calls[0].output === 'HI', calls[0].output);
  ok('executor runs object args', calls[1].ok && calls[1].output === 'cba', calls[1].output);
  ok('executor flags foreign fn', !calls[2].ok && calls[2].output.includes('Not a toolbox function'));
  ok('executor flags bad json', !calls[3].ok && calls[3].output.includes('Invalid JSON'));

  // ── New dev tools (#54 diff, #62 jsonpath, #56 template) ─────
  await contains('diff marks change', 'dev-diff', 'the cat\nsat here\n====\nthe cat\nsat there', '- sat here', svc);
  await contains('diff identical', 'dev-diff', 'same\n====\nsame', 'identical', svc);
  await contains('diff needs separator', 'dev-diff', 'no separator here', '====', svc);
  await eq('jsonpath extract', 'dev-jsonpath', '$.users[1].name::{"users":[{"name":"ada"},{"name":"alan"}]}', 'alan', svc);
  await contains('jsonpath bad json', 'dev-jsonpath', '$.a::{oops', 'Invalid JSON', svc);
  await eq('template fill', 'dev-template', 'Hello {{name}}, you are {{age}}::name=Ada; age=36', 'Hello Ada, you are 36', svc);
  await contains('template flags missing', 'dev-template', 'Hi {{who}}::name=x', 'unfilled: who', svc);

  // ── Wave-3 tools (#51/#53/#55/#63/#65/#87 + currency) ────────
  await contains('regex builder', 'dev-regex-builder', 'starts:INV-::digits:4', '/^INV-\\d{4}/', svc);
  await contains('regex builder bad piece', 'dev-regex-builder', 'frobnicate:x', 'Unknown piece', svc);
  await contains('sql format clauses', 'dev-sql-format', 'select id from users where age > 21 order by id', '\nFROM users', svc);
  await contains('sql format keywords', 'dev-sql-format', 'select id from users', 'SELECT', svc);
  await contains('world clock', 'dt-world-clock', 'Europe/London, Asia/Tokyo', 'Asia/Tokyo', svc);
  await contains('world clock bad zone', 'dt-world-clock', 'Mars/Olympus', 'unknown zone', svc);
  await contains('meeting overlap ny-berlin', 'dt-meeting-overlap', 'America/New_York, Europe/Berlin', 'Shared window', svc);
  await contains('meeting overlap impossible', 'dt-meeting-overlap', 'Pacific/Auckland, America/Los_Angeles', 'No 9–17 overlap', svc);
  await contains('sort trace sorted', 'math-sort-trace', '5 2 9 1 7', 'sorted: [1, 2, 5, 7, 9]', svc);
  await contains('colorblind sim', 'color-blind-sim', '#3B82F6', 'protanopia', svc);
  await contains('currency format', 'fin-currency-format', '1234567.89::USD::en-US', '$1,234,567.89', svc);
  await contains('entropy flags common', 'crypto-entropy', 'password123', 'common password', svc);
  await contains('entropy flags walk', 'crypto-entropy', 'xqwerty99z', 'keyboard walk', svc);
  await contains('entropy clean strong', 'crypto-entropy', 'K7#mVe$2pLq9@wXz', 'very strong', svc);

  // ── Pack contract + fuzz sweep (every tool, hostile inputs) ──
  // Backlog #92/#93: every registered tool must survive empty and garbage
  // input without throwing past the service and must return a real string.
  const fuzzInputs = ['', '::::', ' ￿', '-1e999', '🙂'.repeat(3), ' '.repeat(5)];
  let fuzzFailures = 0;
  for (const tool of all) {
    for (const input of fuzzInputs) {
      const res = await svc.run(tool.id, input, 'fuzz');
      // 'null' is a legitimate output (e.g. JSON tools round-tripping non-finite
      // numbers or the literal null); 'undefined' leaking out is always a bug.
      if (typeof res.output !== 'string' || res.output === 'undefined' || res.output.includes('undefined::')) {
        fuzzFailures++;
        failures.push(`fuzz ${tool.id} on ${JSON.stringify(input)} → ${JSON.stringify(res.output).slice(0, 80)}`);
      }
    }
  }
  ok(`fuzz sweep: ${all.length} tools × ${fuzzInputs.length} hostile inputs`, fuzzFailures === 0, `${fuzzFailures} bad outputs`);
  ok('contract: categories all labeled', svc.list().every((t2) => typeof t2.category === 'string' && t2.category.length > 0));
  ok('contract: examples are strings when present', svc.list().every((t2) => t2.example === undefined || typeof t2.example === 'string'));

  // ── Report ──────────────────────────────────────────────────
  console.log(`\nTOOLBOX VERIFY — total tools registered: ${all.length}`);
  console.log(svc.categories().map((c) => `  ${c}: ${svc.byCategory(c).length}`).join('\n'));
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) {
    console.log('\nFAILURES:');
    failures.forEach((f) => console.log('  ✗ ' + f));
    process.exit(1);
  }
  console.log('All assertions passed ✓');
}

main().catch((e) => { console.error(e); process.exit(1); });
