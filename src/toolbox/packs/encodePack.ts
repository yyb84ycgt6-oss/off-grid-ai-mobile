/**
 * Encoders & Ciphers pack — base64, URL, HTML, hex, binary, classic ciphers.
 * All reversible transforms are offline and dependency-free.
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
  id, name, description, category: 'encode', tags: ['encode', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const utf8ToBytes = (s: string): number[] => [...new TextEncoder().encode(s)];
const bytesToUtf8 = (b: number[] | Uint8Array): string => new TextDecoder().decode(new Uint8Array(b));

const b64encode = (s: string): string => {
  const bytes = utf8ToBytes(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};
const b64decode = (s: string): string => {
  const bin = atob(s.trim());
  const bytes = [...bin].map((c) => c.charCodeAt(0));
  return bytesToUtf8(bytes);
};

const rot = (s: string, n: number): string =>
  s.replace(/[a-z]/gi, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + n) % 26 + 26) % 26 + base);
  });

const MORSE: Record<string, string> = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....',
  i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.',
  q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-',
  y: '-.--', z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.',
  '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
  '+': '.-.-.', '-': '-....-', '"': '.-..-.', '@': '.--.-.',
};
const MORSE_REV: Record<string, string> = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

export const encodePack: ToolboxTool[] = [
  t('enc-base64-encode', 'Base64 Encode', 'Encode text to Base64.', 'any text', b64encode, ['base64'], 'Hello, World!'),
  t('enc-base64-decode', 'Base64 Decode', 'Decode Base64 back to text.', 'base64 string', b64decode, ['base64'], 'SGVsbG8sIFdvcmxkIQ=='),
  t('enc-base64url-encode', 'Base64URL Encode', 'URL-safe Base64 (no padding, - and _).', 'any text', (s) => b64encode(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), ['base64', 'url']),
  t('enc-base64url-decode', 'Base64URL Decode', 'Decode URL-safe Base64.', 'base64url string', (s) => {
    let x = s.replace(/-/g, '+').replace(/_/g, '/');
    while (x.length % 4) x += '=';
    return b64decode(x);
  }, ['base64', 'url']),
  t('enc-url-encode', 'URL Encode', 'Percent-encode a string for URLs.', 'any text', (s) => encodeURIComponent(s), ['url'], 'a b&c=d'),
  t('enc-url-decode', 'URL Decode', 'Decode a percent-encoded string.', 'encoded string', (s) => decodeURIComponent(s.trim()), ['url'], 'a%20b%26c%3Dd'),
  t('enc-html-encode', 'HTML Entity Encode', 'Escape &, <, >, ", \' as HTML entities.', 'any text', (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'), ['html'], '<b class="x">'),
  t('enc-html-decode', 'HTML Entity Decode', 'Decode common HTML entities to characters.', 'HTML entities', (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)), ['html']),
  t('enc-hex-encode', 'Text → Hex', 'Encode text as space-separated hex bytes.', 'any text', (s) => utf8ToBytes(s).map((b) => b.toString(16).padStart(2, '0')).join(' '), ['hex'], 'Hi'),
  t('enc-hex-decode', 'Hex → Text', 'Decode hex bytes back to text.', 'hex bytes (spaces optional)', (s) => bytesToUtf8((s.replace(/[^0-9a-fA-F]/g, '').match(/.{1,2}/g) || []).map((h) => parseInt(h, 16))), ['hex'], '48 69'),
  t('enc-binary-encode', 'Text → Binary', 'Encode text as space-separated 8-bit binary.', 'any text', (s) => utf8ToBytes(s).map((b) => b.toString(2).padStart(8, '0')).join(' '), ['binary'], 'Hi'),
  t('enc-binary-decode', 'Binary → Text', 'Decode 8-bit binary groups to text.', 'binary (spaces optional)', (s) => bytesToUtf8((s.replace(/[^01]/g, '').match(/.{1,8}/g) || []).map((b) => parseInt(b, 2))), ['binary'], '01001000 01101001'),
  t('enc-decimal-encode', 'Text → Decimal Codes', 'Encode text as decimal char codes.', 'any text', (s) => utf8ToBytes(s).join(' '), ['decimal']),
  t('enc-decimal-decode', 'Decimal Codes → Text', 'Decode space-separated decimal codes.', 'decimal codes', (s) => bytesToUtf8((s.match(/\d+/g) || []).map(Number)), ['decimal'], '72 105'),
  t('enc-rot13', 'ROT13', 'Rotate letters by 13 (self-inverse).', 'any text', (s) => rot(s, 13), ['cipher'], 'Hello'),
  t('enc-rot47', 'ROT47', 'Rotate printable ASCII by 47 (self-inverse).', 'any text', (s) => s.replace(/[!-~]/g, (c) => String.fromCharCode(33 + ((c.charCodeAt(0) - 33 + 47) % 94))), ['cipher']),
  t('enc-caesar', 'Caesar Cipher', 'Shift letters by N. Format: shift::text', 'shift::text', (s) => {
    const [n, ...rest] = s.split('::');
    const shift = parseInt(n, 10);
    if (isNaN(shift)) return 'Format: shift::text  (e.g. 3::Attack at dawn)';
    return rot(rest.join('::'), shift);
  }, ['cipher'], '3::Attack at dawn'),
  t('enc-atbash', 'Atbash Cipher', 'Mirror the alphabet (a↔z). Self-inverse.', 'any text', (s) => s.replace(/[a-z]/gi, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base));
  }), ['cipher'], 'hello'),
  t('enc-vigenere-encrypt', 'Vigenère Encrypt', 'Polyalphabetic cipher. Format: key::text', 'key::text', (s) => {
    const [key, ...rest] = s.split('::');
    const text = rest.join('::');
    if (!key) return 'Format: key::text  (e.g. lemon::Attack at dawn)';
    const k = key.toLowerCase().replace(/[^a-z]/g, '');
    if (!k) return 'Key must contain letters.';
    let i = 0;
    return text.replace(/[a-z]/gi, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      const shift = k.charCodeAt(i++ % k.length) - 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
    });
  }, ['cipher'], 'lemon::Attack at dawn'),
  t('enc-vigenere-decrypt', 'Vigenère Decrypt', 'Reverse a Vigenère cipher. Format: key::text', 'key::text', (s) => {
    const [key, ...rest] = s.split('::');
    const text = rest.join('::');
    if (!key) return 'Format: key::text';
    const k = key.toLowerCase().replace(/[^a-z]/g, '');
    if (!k) return 'Key must contain letters.';
    let i = 0;
    return text.replace(/[a-z]/gi, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      const shift = k.charCodeAt(i++ % k.length) - 97;
      return String.fromCharCode(((c.charCodeAt(0) - base - shift + 26) % 26) + base);
    });
  }, ['cipher']),
  t('enc-morse-encode', 'Text → Morse Code', 'Encode text to Morse (/ between words).', 'letters, digits, punctuation', (s) => s.toLowerCase().trim().split(/\s+/).map((w) => [...w].map((c) => MORSE[c] || '').filter(Boolean).join(' ')).join(' / '), ['morse'], 'sos help'),
  t('enc-morse-decode', 'Morse Code → Text', 'Decode Morse (words separated by /).', 'morse code', (s) => s.trim().split(/\s*\/\s*/).map((w) => w.split(/\s+/).map((code) => MORSE_REV[code] || '').join('')).join(' '), ['morse'], '... --- ... / .... . .-.. .--.'),
  t('enc-unicode-escape', 'Text → Unicode Escapes', 'Encode as \\uXXXX escape sequences.', 'any text', (s) => [...s].map((c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(''), ['unicode']),
  t('enc-unicode-unescape', 'Unicode Escapes → Text', 'Decode \\uXXXX escape sequences.', '\\uXXXX sequence', (s) => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), ['unicode']),
  t('enc-base32-encode', 'Base32 Encode', 'RFC 4648 Base32 encode.', 'any text', (s) => {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const bytes = utf8ToBytes(s);
    let bits = '';
    bytes.forEach((b) => (bits += b.toString(2).padStart(8, '0')));
    let out = '';
    for (let i = 0; i < bits.length; i += 5) out += alpha[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
    while (out.length % 8) out += '=';
    return out;
  }, ['base32']),
  t('enc-base32-decode', 'Base32 Decode', 'RFC 4648 Base32 decode.', 'base32 string', (s) => {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    [...s.toUpperCase().replace(/=+$/, '')].forEach((c) => {
      const idx = alpha.indexOf(c);
      if (idx >= 0) bits += idx.toString(2).padStart(5, '0');
    });
    const bytes: number[] = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
    return bytesToUtf8(bytes);
  }, ['base32']),
  t('enc-ascii85-encode', 'ASCII85 Encode', 'Adobe ASCII85 (base85) encode.', 'any text', (s) => {
    const bytes = utf8ToBytes(s);
    let out = '';
    for (let i = 0; i < bytes.length; i += 4) {
      const chunk = bytes.slice(i, i + 4);
      const pad = 4 - chunk.length;
      while (chunk.length < 4) chunk.push(0);
      let num = ((chunk[0] * 256 + chunk[1]) * 256 + chunk[2]) * 256 + chunk[3];
      const group: string[] = [];
      for (let j = 0; j < 5; j++) { group.unshift(String.fromCharCode(33 + (num % 85))); num = Math.floor(num / 85); }
      out += group.join('').slice(0, 5 - pad);
    }
    return '<~' + out + '~>';
  }, ['base85']),
  t('enc-reverse-bytes', 'Reverse Byte Order', 'Reverse the UTF-8 byte sequence and re-decode.', 'any text', (s) => {
    try { return bytesToUtf8(utf8ToBytes(s).reverse()); } catch { return '(byte reversal produced invalid UTF-8)'; }
  }, ['bytes']),
  t('enc-charcodes-hex-cont', 'Text → Continuous Hex', 'Hex with no separators (for hashes/keys).', 'any text', (s) => utf8ToBytes(s).map((b) => b.toString(16).padStart(2, '0')).join(''), ['hex']),
  t('enc-base58-encode', 'Base58 Encode', 'Bitcoin-alphabet Base58 (no 0/O/I/l).', 'any text', (s) => {
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const bytes = utf8ToBytes(s);
    if (!bytes.length) return 'Enter text to encode.';
    let zeros = 0;
    while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
    const digits: number[] = [];
    for (const byte of bytes) {
      let carry = byte;
      for (let i = 0; i < digits.length; i++) { carry += digits[i] << 8; digits[i] = carry % 58; carry = (carry / 58) | 0; }
      while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
    }
    return '1'.repeat(zeros) + digits.reverse().map((d) => A[d]).join('');
  }, ['base58'], 'Hello World!'),
  t('enc-base58-decode', 'Base58 Decode', 'Decode Bitcoin-alphabet Base58 back to text.', 'base58 string', (s) => {
    const A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const src = s.trim();
    if (!src) return 'Enter a Base58 string.';
    let zeros = 0;
    while (zeros < src.length && src[zeros] === '1') zeros++;
    const bytes: number[] = [];
    for (const ch of src) {
      const val = A.indexOf(ch);
      if (val < 0) return `Invalid Base58 character: "${ch}"`;
      let carry = val;
      for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8; }
      while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
    }
    const full = new Uint8Array(zeros + bytes.length);
    full.set(bytes.reverse(), zeros);
    try { return bytesToUtf8(full); } catch { return '(decoded bytes are not valid UTF-8: ' + [...full].map((b) => b.toString(16).padStart(2, '0')).join(' ') + ')'; }
  }, ['base58'], '2NEpo7TZRRrLZSi2U'),
  t('enc-codepoints', 'Text → Unicode Codepoints', 'U+XXXX notation for every character.', 'any text', (s) => {
    if (!s) return 'Enter text.';
    return [...s].map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')} ${c}`).join('\n');
  }, ['unicode'], 'Héllo'),
  t('enc-from-codepoints', 'Codepoints → Text', 'Rebuild text from U+XXXX (or plain hex) codepoints.', 'U+0048 U+0069 …', (s) => {
    const pts = s.match(/(?:U\+)?([0-9a-fA-F]{2,6})/g);
    if (!pts) return 'Enter codepoints like U+0048 U+0069.';
    try { return pts.map((p) => String.fromCodePoint(parseInt(p.replace(/^U\+/i, ''), 16))).join(''); }
    catch { return 'One of those codepoints is out of Unicode range.'; }
  }, ['unicode'], 'U+0048 U+0069'),
  t('enc-utf8-bytes', 'UTF-8 Byte Inspector', 'Show the raw UTF-8 encoding of each character.', 'any text', (s) => {
    if (!s) return 'Enter text.';
    return [...s].map((c) => {
      const enc = new TextEncoder().encode(c);
      return `${c}  →  ${[...enc].map((b) => b.toString(16).padStart(2, '0')).join(' ')} (${enc.length} byte${enc.length > 1 ? 's' : ''})`;
    }).join('\n');
  }, ['utf8', 'bytes'], 'A€'),
  t('enc-quoted-printable', 'Quoted-Printable Encode', 'MIME quoted-printable (soft line breaks omitted).', 'any text', (s) => {
    if (!s) return 'Enter text.';
    return utf8ToBytes(s).map((b) => {
      const isSafe = (b >= 33 && b <= 126 && b !== 61) || b === 32 || b === 9;
      return isSafe ? String.fromCharCode(b) : `=${b.toString(16).toUpperCase().padStart(2, '0')}`;
    }).join('');
  }, ['mime', 'qp'], 'Héllo = Wörld'),
  t('enc-quoted-printable-decode', 'Quoted-Printable Decode', 'Decode MIME =XX sequences back to text.', 'quoted-printable', (s) => {
    if (!s.trim()) return 'Enter quoted-printable text.';
    const bytes: number[] = [];
    const src = s.replace(/=\r?\n/g, '');
    for (let i = 0; i < src.length; i++) {
      if (src[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(src.slice(i + 1, i + 3))) { bytes.push(parseInt(src.slice(i + 1, i + 3), 16)); i += 2; }
      else bytes.push(src.charCodeAt(i));
    }
    try { return bytesToUtf8(bytes); } catch { return '(decoded bytes are not valid UTF-8)'; }
  }, ['mime', 'qp'], 'H=C3=A9llo = W=C3=B6rld'),
];
