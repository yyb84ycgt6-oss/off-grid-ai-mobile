/**
 * Hashing & Crypto pack — WebCrypto digests, HMAC, checksums, UUIDs, tokens.
 * WebCrypto is offline (no network); non-crypto hashes are pure JS.
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
  id, name, description, category: 'crypto', tags: ['crypto', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const toHex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const digest = (algo: string) => async (s: string): Promise<string> => {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest(algo, data);
  return toHex(buf);
};

/**
 * Pure-JS MD5 (RFC 1321). WebCrypto omits MD5, so we implement it directly:
 * the K table is derived at runtime from sin(i), per the spec, so there are
 * no magic constants to mistype. For checksums/legacy interop only.
 */
function md5(input: string): string {
  const msg = new TextEncoder().encode(input);
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const bitLen = msg.length * 8;
  const padded = new Uint8Array((((msg.length + 8) >> 6) << 6) + 64);
  padded.set(msg);
  padded[msg.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLen >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLen / 2 ** 32), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let off = 0; off < padded.length; off += 64) {
    const M = Array.from({ length: 16 }, (_, i) => view.getUint32(off + i * 4, true));
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      const sum = (F + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + (((sum << S[i]) | (sum >>> (32 - S[i]))) >>> 0)) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  return [a0, b0, c0, d0].map((x) => {
    const b = new Uint8Array(4);
    new DataView(b.buffer).setUint32(0, x, true);
    return [...b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }).join('');
}

export const cryptoPack: ToolboxTool[] = [
  t('hash-sha1', 'SHA-1 Hash', 'Compute the SHA-1 digest (160-bit hex).', 'any text', digest('SHA-1'), ['hash'], 'password'),
  t('hash-sha256', 'SHA-256 Hash', 'Compute the SHA-256 digest (256-bit hex).', 'any text', digest('SHA-256'), ['hash'], 'password'),
  t('hash-sha384', 'SHA-384 Hash', 'Compute the SHA-384 digest.', 'any text', digest('SHA-384'), ['hash']),
  t('hash-sha512', 'SHA-512 Hash', 'Compute the SHA-512 digest (512-bit hex).', 'any text', digest('SHA-512'), ['hash']),
  t('hash-hmac-sha256', 'HMAC-SHA256', 'Keyed hash. Format: key::message', 'key::message', async (s) => {
    const [key, ...rest] = s.split('::');
    const msg = rest.join('::');
    if (rest.length === 0) return 'Format: key::message';
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
    return toHex(sig);
  }, ['hmac'], 'secret::hello'),
  t('hash-hmac-sha512', 'HMAC-SHA512', 'Keyed SHA-512 hash. Format: key::message', 'key::message', async (s) => {
    const [key, ...rest] = s.split('::');
    const msg = rest.join('::');
    if (rest.length === 0) return 'Format: key::message';
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg));
    return toHex(sig);
  }, ['hmac']),
  t('hash-md5', 'MD5 Hash', 'Compute an MD5 digest (legacy interop/checksums — not for security).', 'any text', (s) => md5(s), ['hash', 'legacy'], 'abc'),
  t('hash-adler32', 'Adler-32 Checksum', 'Compute the Adler-32 checksum (zlib).', 'any text', (s) => {
    let a = 1, b = 0;
    const bytes = new TextEncoder().encode(s);
    for (let i = 0; i < bytes.length; i++) { a = (a + bytes[i]) % 65521; b = (b + a) % 65521; }
    return (((b << 16) | a) >>> 0).toString(16).padStart(8, '0');
  }, ['checksum'], 'Wikipedia'),
  t('hash-crc16', 'CRC-16/CCITT', 'Compute CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF).', 'any text', (s) => {
    let crc = 0xffff;
    const bytes = new TextEncoder().encode(s);
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i] << 8;
      for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc.toString(16).padStart(4, '0').toUpperCase();
  }, ['checksum'], '123456789'),
  t('hash-sdbm', 'SDBM Hash', 'Compute the classic SDBM string hash.', 'any text', (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (s.charCodeAt(i) + (h << 6) + (h << 16) - h) >>> 0;
    return h.toString(16).padStart(8, '0');
  }, ['checksum']),
  t('hash-crc32', 'CRC32 Checksum', 'Compute a CRC32 checksum (8 hex digits).', 'any text', (s) => {
    let crc = 0xffffffff;
    const bytes = new TextEncoder().encode(s);
    for (let i = 0; i < bytes.length; i++) {
      crc ^= bytes[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
  }, ['checksum'], 'The quick brown fox'),
  t('hash-fnv1a', 'FNV-1a Hash', 'Compute a fast 32-bit FNV-1a hash.', 'any text', (s) => {
    let h = 0x811c9dc5;
    const bytes = new TextEncoder().encode(s);
    for (let i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }, ['checksum']),
  t('hash-djb2', 'djb2 Hash', 'Compute the classic djb2 string hash.', 'any text', (s) => {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(8, '0');
  }, ['checksum']),
  t('hash-luhn-check', 'Luhn Validate', 'Check a number (e.g. card) against the Luhn checksum.', 'digits', (s) => {
    const d = s.replace(/\D/g, '');
    if (!d) return 'Enter digits.';
    let sum = 0, alt = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = +d[i];
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return sum % 10 === 0 ? `VALID (Luhn checksum passes) — ${d.length} digits` : 'INVALID (Luhn checksum fails)';
  }, ['validate'], '4539 1488 0343 6467'),
  t('hash-luhn-digit', 'Luhn Check Digit', 'Compute the Luhn check digit for a partial number.', 'digits (without check digit)', (s) => {
    const d = s.replace(/\D/g, '');
    if (!d) return 'Enter digits.';
    let sum = 0, alt = true;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = +d[i];
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n; alt = !alt;
    }
    return `Check digit: ${(10 - (sum % 10)) % 10}  →  full: ${d}${(10 - (sum % 10)) % 10}`;
  }, ['validate']),
  t('gen-uuid-v4', 'UUID v4', 'Generate a random RFC 4122 v4 UUID.', 'press run (input ignored)', () => crypto.randomUUID(), ['uuid', 'generate']),
  t('gen-uuid-bulk', 'UUID v4 ×10', 'Generate ten random UUIDs.', 'press run (input ignored)', () => Array.from({ length: 10 }, () => crypto.randomUUID()).join('\n'), ['uuid', 'generate']),
  t('gen-nanoid', 'NanoID', 'Generate a 21-char URL-safe unique id.', 'press run (input ignored)', () => {
    const alpha = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';
    const bytes = crypto.getRandomValues(new Uint8Array(21));
    return [...bytes].map((b) => alpha[b & 63]).join('');
  }, ['generate']),
  t('gen-token-hex', 'Random Hex Token', 'Generate a 32-byte cryptographically random hex token.', 'press run (input ignored)', () => [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, '0')).join(''), ['token', 'generate']),
  t('gen-token-base64', 'Random Base64 Token', 'Generate a 32-byte random URL-safe token.', 'press run (input ignored)', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let bin = '';
    bytes.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }, ['token', 'generate']),
  t('gen-password', 'Strong Password', 'Generate a 20-char password with mixed classes.', 'optional length (default 20)', (s) => {
    const len = Math.min(Math.max(parseInt(s) || 20, 8), 128);
    const sets = ['abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789', '!@#$%^&*()-_=+[]{}'];
    const all = sets.join('');
    const bytes = crypto.getRandomValues(new Uint32Array(len));
    const out = sets.map((set, i) => set[bytes[i] % set.length]);
    for (let i = sets.length; i < len; i++) out.push(all[bytes[i] % all.length]);
    for (let i = out.length - 1; i > 0; i--) { const j = bytes[i] % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
    return out.join('');
  }, ['password', 'generate'], '24'),
  t('gen-passphrase', 'Passphrase', 'Generate a 5-word diceware-style passphrase.', 'optional word count (default 5)', (s) => {
    const words = 'able acid aged also area army away baby back ball band bank base bath bear beat been bell belt bird blow blue boat body bone book boot born boss both bowl bulk burn bush busy call calm came camp card care case cash cast cell chat chip city clay club coal coat code cold come cook cool cope copy cord core corn cost crew crop dark data date dawn days dead deal dean dear debt deep deny desk dial diet disc disk does done door dose down draw drew drop drug drum dual duke dust duty each earn ease east easy edge else even ever evil exit face fact fade fail fair fall farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish five flag flat flew flow foot ford form fort four free from fuel full fund gain game gate gave gear gene gift girl give glad goal goes gold golf gone good gray grew grey grow gulf hair half hall hand hang hard harm hate have head hear heat held hell help herb here hero high hill hire hold hole holy home hope host hour huge hung hunt hurt icon idea inch iron item jack join jump jury just keen keep kept kick kill kind king knee knew know lack lady laid lake land lane last late lawn lead leaf lean left less life lift like line link list live load loan lock long look lord lose loss lost loud love luck made mail main make male mall many mark mass mate maze mean meat meet mens mere mesh mild mile milk mill mind mine miss mode mood moon more most move much must nail name navy near neat neck need news next nice nine node none noon norm nose note noun okay once only onto open oral oven over pace pack page paid pain pair palm park part pass past path peak pear peer pick pile pill pine pink pipe plan play plot plug plus poem poet poll pond pool poor pope port pose post pour pray prep prey pull pump pure push quit race rack rage rail rain rank rare rate read real rear rely rent rest rice rich ride ring rise risk road rock role roll roof room root rope rose ruby rule rush safe said sail salt same sand save seat seed seek seem seen self sell send sept ship shop shot show shut sick side sign silk sing sink site size skin slip slow snap snow soap sock soft soil sold sole solo some song sort soul soup spin spot star stay stem step stir stop stub such suit sure swim tail take tale talk tall tank tape task taxi team tear tech tell tend tent term test text than that them then they thin this thus tide tidy tied tier ties tile till time tiny told toll tomb tone took tool tore torn tour town trap tree trim trip true tube tune turn twin type unit upon urge used user vary vast verb very vibe view vine visa void vote wade wage wait wake walk wall want ward warm warn wash wave weak wear week well went were west what when whom wide wife wild will wind wine wing wire wise wish with wolf wood wool word wore work worm worn wrap yard yarn yeah year yoga your zero zone zoom'.split(' ');
    const count = Math.min(Math.max(parseInt(s) || 5, 3), 12);
    const idx = crypto.getRandomValues(new Uint32Array(count));
    const num = crypto.getRandomValues(new Uint16Array(1))[0] % 100;
    return [...idx].map((r) => words[r % words.length]).join('-') + '-' + num;
  }, ['password', 'generate']),
  t('crypto-random-int', 'Secure Random Int', 'Cryptographically random integer. Format: min::max', 'min::max', (s) => {
    const [lo, hi] = s.split('::').map((x) => parseInt(x.trim(), 10));
    if (isNaN(lo) || isNaN(hi) || hi < lo) return 'Format: min::max  (e.g. 1::100)';
    const range = hi - lo + 1;
    const r = crypto.getRandomValues(new Uint32Array(1))[0];
    return String(lo + (r % range));
  }, ['random'], '1::100'),
  t('crypto-entropy', 'Password Entropy', 'Estimate password strength in bits, plus weak-pattern checks (common passwords, keyboard walks, repeats).', 'a password', (s) => {
    if (!s) return 'Enter a password to score.';
    let pool = 0;
    if (/[a-z]/.test(s)) pool += 26;
    if (/[A-Z]/.test(s)) pool += 26;
    if (/[0-9]/.test(s)) pool += 10;
    if (/[^a-zA-Z0-9]/.test(s)) pool += 33;
    const bits = s.length * Math.log2(pool || 1);
    // Weak-pattern heuristics (backlog #87) — each finding caps the verdict.
    const low = s.toLowerCase();
    const warnings: string[] = [];
    const common = ['password', '123456', 'qwerty', 'letmein', 'welcome', 'admin', 'iloveyou', 'monkey', 'dragon', 'abc123', 'football', 'baseball', 'sunshine', 'princess', 'trustno1', 'master', 'shadow', '111111', '000000', 'passw0rd', 'password1'];
    if (common.some((c) => low === c || low.startsWith(c))) warnings.push('starts with a top-25 common password');
    const walks = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', '0987654321', 'poiuytrewq', 'lkjhgfdsa', 'mnbvcxz'];
    if (walks.some((w) => { for (let i = 0; i + 4 <= w.length; i++) if (low.includes(w.slice(i, i + 4))) return true; return false; })) warnings.push('contains a keyboard walk (e.g. qwer, 1234)');
    if (/(.)\1{2,}/.test(s)) warnings.push('has a character repeated 3+ times in a row');
    if (/^(19|20)\d{2}$/.test(s.slice(-4))) warnings.push('ends in a year — a very common pattern');
    if (/^[A-Z][a-z]+\d{1,4}[!.?]?$/.test(s)) warnings.push('matches the Word+digits+punct template attackers try first');
    const verdict = warnings.length ? 'weak (pattern-based attacks beat raw entropy)' : bits < 40 ? 'weak' : bits < 60 ? 'fair' : bits < 80 ? 'strong' : 'very strong';
    return [
      `Length ${s.length}, pool ${pool} → ${bits.toFixed(1)} bits (${verdict})`,
      ...warnings.map((w) => `⚠ ${w}`),
    ].join('\n');
  }, ['password'], 'Tr0ub4dour&3'),
];
