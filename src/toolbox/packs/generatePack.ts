/**
 * Generators pack — placeholder data, identifiers, patterns, QR-ready payloads.
 * Deterministic where useful; random draws use crypto where it matters.
 */
import { ToolboxTool } from '../types';

const t = (
  id: string,
  name: string,
  description: string,
  inputHint: string,
  run: (s: string) => string | Promise<string>,
  tags: string[] = [],
  example?: string
): ToolboxTool => ({
  id, name, description, category: 'generate', tags: ['generate', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const FIRST = ['Ada', 'Alan', 'Grace', 'Linus', 'Katherine', 'Dennis', 'Barbara', 'Ken', 'Margaret', 'Tim', 'Radia', 'Vint', 'Hedy', 'Claude', 'Donald'];
const LAST = ['Lovelace', 'Turing', 'Hopper', 'Torvalds', 'Johnson', 'Ritchie', 'Liskov', 'Thompson', 'Hamilton', 'Berners-Lee', 'Perlman', 'Cerf', 'Lamarr', 'Shannon', 'Knuth'];
const DOMAINS = ['example.com', 'mail.test', 'inbox.dev', 'offgrid.local', 'sample.org'];
const STREETS = ['Maple', 'Oak', 'Pine', 'Cedar', 'Elm', 'Sunset', 'Riverside', 'Hilltop', 'Lakeview', 'Broadway'];
const CITIES = ['Springfield', 'Riverton', 'Fairview', 'Franklin', 'Georgetown', 'Clinton', 'Madison', 'Arlington'];

export const generatePack: ToolboxTool[] = [
  t('gen-name', 'Random Name', 'Generate a random full name.', 'optional count (default 5)', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 5, 1), 50);
    return Array.from({ length: n }, () => `${pick(FIRST)} ${pick(LAST)}`).join('\n');
  }, ['fake', 'name'], '5'),
  t('gen-email', 'Fake Email', 'Generate random test email addresses.', 'optional count (default 5)', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 5, 1), 50);
    return Array.from({ length: n }, () => `${pick(FIRST).toLowerCase()}.${pick(LAST).toLowerCase().replace(/[^a-z]/g, '')}${Math.floor(Math.random() * 99)}@${pick(DOMAINS)}`).join('\n');
  }, ['fake', 'email'], '5'),
  t('gen-address', 'Fake Address', 'Generate a random US-style street address.', 'optional count (default 3)', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 3, 1), 25);
    return Array.from({ length: n }, () => `${Math.floor(Math.random() * 9900) + 100} ${pick(STREETS)} St, ${pick(CITIES)}, ${['CA', 'NY', 'TX', 'WA', 'IL'][Math.floor(Math.random() * 5)]} ${String(Math.floor(Math.random() * 90000) + 10000)}`).join('\n');
  }, ['fake', 'address'], '3'),
  t('gen-phone', 'Fake Phone Number', 'Generate random US-format phone numbers (555 exchange).', 'optional count (default 5)', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 5, 1), 50);
    return Array.from({ length: n }, () => `(${Math.floor(Math.random() * 800) + 200}) 555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`).join('\n');
  }, ['fake', 'phone'], '5'),
  t('gen-username', 'Username Generator', 'Generate handle-style usernames.', 'optional count (default 8)', (s) => {
    const adj = ['swift', 'quiet', 'brave', 'lunar', 'neon', 'cosmic', 'iron', 'silent', 'hyper', 'pixel'];
    const noun = ['fox', 'wolf', 'raven', 'comet', 'byte', 'nova', 'echo', 'drift', 'forge', 'spark'];
    const n = Math.min(Math.max(parseInt(s) || 8, 1), 50);
    return Array.from({ length: n }, () => `${pick(adj)}_${pick(noun)}${Math.floor(Math.random() * 999)}`).join('\n');
  }, ['fake', 'username'], '8'),
  t('gen-credit-card-test', 'Test Card Number', 'Generate a Luhn-valid TEST card number (not real).', 'optional prefix (default 4)', (s) => {
    const prefix = (s.trim().match(/\d+/)?.[0] || '4').slice(0, 6);
    const digits = (prefix + Array.from({ length: 15 - prefix.length }, () => Math.floor(Math.random() * 10)).join('')).slice(0, 15).split('').map(Number);
    let sum = 0, alt = true;
    for (let i = digits.length - 1; i >= 0; i--) { let d = digits[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } sum += d; alt = !alt; }
    const check = (10 - (sum % 10)) % 10;
    const full = digits.join('') + check;
    return `${full.replace(/(.{4})/g, '$1 ').trim()}\n(Luhn-valid TEST number — not a real account.)`;
  }, ['fake', 'card'], '4'),
  t('gen-hex-color-set', 'Random Palette', 'Generate a set of random hex colors.', 'optional count (default 5)', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 5, 1), 20);
    return Array.from({ length: n }, () => '#' + Array.from({ length: 6 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('')).join('\n');
  }, ['color'], '5'),
  t('gen-string', 'Random String', 'Generate a random alphanumeric string. Format: length (default 16)', 'length', (s) => {
    const len = Math.min(Math.max(parseInt(s) || 16, 1), 256);
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.getRandomValues(new Uint8Array(len));
    return [...bytes].map((b) => alpha[b % alpha.length]).join('');
  }, ['random'], '24'),
  t('gen-pin', 'Random PIN', 'Generate a numeric PIN of a given length.', 'length (default 4)', (s) => {
    const len = Math.min(Math.max(parseInt(s) || 4, 3), 12);
    return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');
  }, ['random'], '6'),
  t('gen-mac', 'Random MAC Address', 'Generate a random (locally administered) MAC.', 'press run (input ignored)', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    bytes[0] = (bytes[0] & 0xfc) | 0x02;
    return [...bytes].map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':');
  }, ['network']),
  t('gen-ipv4', 'Random IPv4', 'Generate a random public-looking IPv4 address.', 'optional count (default 5)', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 5, 1), 50);
    return Array.from({ length: n }, () => `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 254) + 1}`).join('\n');
  }, ['network'], '5'),
  t('gen-uuid-namespace', 'Deterministic ID (SHA)', 'Stable short id derived from input text (SHA-256 prefix).', 'any seed text', async (s) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
  }, ['id'], 'my-stable-key'),
  t('gen-barcode-ean13', 'EAN-13 Check Digit', 'Compute the EAN-13 barcode check digit for 12 digits.', '12 digits', (s) => {
    const d = s.replace(/\D/g, ''); if (d.length !== 12) return 'Enter exactly 12 digits.';
    let sum = 0; for (let i = 0; i < 12; i++) sum += +d[i] * (i % 2 ? 3 : 1);
    const check = (10 - (sum % 10)) % 10;
    return `${d}${check}  (check digit: ${check})`;
  }, ['barcode'], '400638133393'),
  t('gen-table-md', 'Markdown Table Skeleton', 'Generate an empty Markdown table. Format: cols::rows', 'cols::rows', (s) => {
    const [c, r] = s.split('::').map(Number); const cols = Math.min(Math.max(c || 3, 1), 12); const rows = Math.min(Math.max(r || 3, 1), 30);
    const header = '| ' + Array.from({ length: cols }, (_, i) => `Col ${i + 1}`).join(' | ') + ' |';
    const sep = '| ' + Array(cols).fill('---').join(' | ') + ' |';
    const body = Array.from({ length: rows }, () => '| ' + Array(cols).fill('   ').join(' | ') + ' |').join('\n');
    return [header, sep, body].join('\n');
  }, ['markdown'], '3::4'),
];
