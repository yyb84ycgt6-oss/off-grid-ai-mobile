/**
 * Text Ops pack — pure string transforms and analysis. Zero dependencies.
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
  id,
  name,
  description,
  category: 'text',
  tags: ['text', ...tags],
  inputHint,
  example,
  seedSize: '1 KB',
  access: 'free',
  run,
});

const words = (s: string): string[] =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);

const cap = (w: string) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w);

const lines = (s: string) => s.split(/\r?\n/);

const UPSIDE: Record<string, string> = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ',
  k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ',
  u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z', '.': '˙', ',': "'", '?': '¿', '!': '¡',
};

const SMALLCAPS: Record<string, string> = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ',
  k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ',
  u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ',
};

const NATO: Record<string, string> = {
  a: 'Alfa', b: 'Bravo', c: 'Charlie', d: 'Delta', e: 'Echo', f: 'Foxtrot', g: 'Golf',
  h: 'Hotel', i: 'India', j: 'Juliett', k: 'Kilo', l: 'Lima', m: 'Mike', n: 'November',
  o: 'Oscar', p: 'Papa', q: 'Quebec', r: 'Romeo', s: 'Sierra', t: 'Tango', u: 'Uniform',
  v: 'Victor', w: 'Whiskey', x: 'Xray', y: 'Yankee', z: 'Zulu',
  '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five',
  '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine',
};

const LEET: Record<string, string> = { a: '4', e: '3', i: '1', o: '0', s: '5', t: '7', l: '1' };

const freqReport = (items: string[], label: string): string => {
  const counts = new Map<string, number>();
  items.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  return `${label} (top ${top.length} of ${counts.size} unique):\n` + top.map(([w, c]) => `${String(c).padStart(5)}  ${w}`).join('\n');
};

const extract = (s: string, re: RegExp, what: string): string => {
  const m = s.match(re) || [];
  return m.length ? [...new Set(m)].join('\n') : `(no ${what} found)`;
};

export const textPack: ToolboxTool[] = [
  // ── Case converters ──────────────────────────────────────────────
  t('text-uppercase', 'UPPERCASE', 'Convert text to all capital letters.', 'any text', (s) => s.toUpperCase(), ['case'], 'hello world'),
  t('text-lowercase', 'lowercase', 'Convert text to all lowercase letters.', 'any text', (s) => s.toLowerCase(), ['case'], 'HELLO WORLD'),
  t('text-titlecase', 'Title Case', 'Capitalize the first letter of every word.', 'any text', (s) => s.replace(/\w\S*/g, cap), ['case'], 'the quick brown fox'),
  t('text-sentencecase', 'Sentence case', 'Capitalize the first letter of every sentence.', 'any text', (s) => s.toLowerCase().replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (c) => c.toUpperCase()), ['case']),
  t('text-camelcase', 'camelCase', 'Join words in camelCase.', 'any text', (s) => words(s).map((w, i) => (i === 0 ? w.toLowerCase() : cap(w))).join(''), ['case'], 'hello world example'),
  t('text-pascalcase', 'PascalCase', 'Join words in PascalCase.', 'any text', (s) => words(s).map(cap).join(''), ['case']),
  t('text-snakecase', 'snake_case', 'Join words with underscores, lowercase.', 'any text', (s) => words(s).join('_').toLowerCase(), ['case']),
  t('text-kebabcase', 'kebab-case', 'Join words with hyphens, lowercase.', 'any text', (s) => words(s).join('-').toLowerCase(), ['case']),
  t('text-constantcase', 'CONSTANT_CASE', 'Join words with underscores, uppercase.', 'any text', (s) => words(s).join('_').toUpperCase(), ['case']),
  t('text-dotcase', 'dot.case', 'Join words with dots, lowercase.', 'any text', (s) => words(s).join('.').toLowerCase(), ['case']),
  t('text-alternating', 'aLtErNaTiNg CaSe', 'Alternate lower/upper per letter.', 'any text', (s) => {
    let i = 0;
    return [...s].map((c) => (/[a-zA-Z]/.test(c) ? (i++ % 2 ? c.toUpperCase() : c.toLowerCase()) : c)).join('');
  }, ['case']),
  t('text-inversecase', 'iNVERSE cASE', 'Swap the case of every letter.', 'any text', (s) => [...s].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''), ['case']),
  t('text-capitalize-lines', 'Capitalize Lines', 'Capitalize the first letter of each line.', 'multi-line text', (s) => lines(s).map((l) => (l ? l[0].toUpperCase() + l.slice(1) : l)).join('\n'), ['case']),

  // ── Reversal / ordering ──────────────────────────────────────────
  t('text-reverse', 'Reverse Text', 'Reverse all characters.', 'any text', (s) => [...s].reverse().join(''), ['reverse'], 'stressed'),
  t('text-reverse-words', 'Reverse Word Order', 'Reverse the order of words.', 'any text', (s) => s.trim().split(/\s+/).reverse().join(' '), ['reverse']),
  t('text-reverse-lines', 'Reverse Line Order', 'Reverse the order of lines.', 'multi-line text', (s) => lines(s).reverse().join('\n'), ['reverse', 'lines']),
  t('text-sort-lines', 'Sort Lines A→Z', 'Sort lines alphabetically ascending.', 'multi-line text', (s) => lines(s).sort((a, b) => a.localeCompare(b)).join('\n'), ['sort', 'lines']),
  t('text-sort-lines-desc', 'Sort Lines Z→A', 'Sort lines alphabetically descending.', 'multi-line text', (s) => lines(s).sort((a, b) => b.localeCompare(a)).join('\n'), ['sort', 'lines']),
  t('text-sort-lines-length', 'Sort Lines by Length', 'Sort lines shortest to longest.', 'multi-line text', (s) => lines(s).sort((a, b) => a.length - b.length).join('\n'), ['sort', 'lines']),
  t('text-shuffle-lines', 'Shuffle Lines', 'Randomly shuffle line order.', 'multi-line text', (s) => {
    const arr = lines(s);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('\n');
  }, ['random', 'lines']),
  t('text-dedupe-lines', 'Deduplicate Lines', 'Remove duplicate lines, keep first occurrence.', 'multi-line text', (s) => [...new Set(lines(s))].join('\n'), ['dedupe', 'lines']),
  t('text-number-lines', 'Number Lines', 'Prefix each line with its line number.', 'multi-line text', (s) => lines(s).map((l, i) => `${i + 1}. ${l}`).join('\n'), ['lines']),

  // ── Cleanup ──────────────────────────────────────────────────────
  t('text-trim-lines', 'Trim Lines', 'Strip leading/trailing whitespace from every line.', 'multi-line text', (s) => lines(s).map((l) => l.trim()).join('\n'), ['clean']),
  t('text-remove-empty-lines', 'Remove Empty Lines', 'Delete blank lines.', 'multi-line text', (s) => lines(s).filter((l) => l.trim() !== '').join('\n'), ['clean', 'lines']),
  t('text-remove-linebreaks', 'Remove Line Breaks', 'Join all lines into one, separated by spaces.', 'multi-line text', (s) => lines(s).map((l) => l.trim()).filter(Boolean).join(' '), ['clean']),
  t('text-collapse-spaces', 'Collapse Extra Spaces', 'Reduce runs of whitespace to a single space.', 'any text', (s) => s.replace(/[ \t]+/g, ' ').trim(), ['clean']),
  t('text-remove-punctuation', 'Remove Punctuation', 'Strip punctuation characters.', 'any text', (s) => s.replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, ''), ['clean']),
  t('text-remove-accents', 'Remove Accents', 'Convert accented characters to plain ASCII (café → cafe).', 'any text', (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, ''), ['clean'], 'café résumé naïve'),
  t('text-strip-html', 'Strip HTML Tags', 'Remove all HTML tags, keeping inner text.', 'HTML fragment', (s) => s.replace(/<[^>]*>/g, ''), ['clean', 'html'], '<b>bold</b> and <i>italic</i>'),
  t('text-strip-nonascii', 'Strip Non-ASCII', 'Remove every character outside printable ASCII.', 'any text', (s) => s.replace(/[^\x20-\x7E\n\t]/g, ''), ['clean']),

  // ── Counting / analysis ─────────────────────────────────────────
  t('text-count-chars', 'Character Count', 'Count characters (with and without spaces).', 'any text', (s) => `Characters: ${s.length}\nWithout spaces: ${s.replace(/\s/g, '').length}`, ['count']),
  t('text-count-words', 'Word Count', 'Count words.', 'any text', (s) => `Words: ${(s.trim().match(/\S+/g) || []).length}`, ['count']),
  t('text-count-lines', 'Line Count', 'Count lines (total and non-empty).', 'multi-line text', (s) => `Lines: ${lines(s).length}\nNon-empty: ${lines(s).filter((l) => l.trim()).length}`, ['count']),
  t('text-count-sentences', 'Sentence Count', 'Count sentences by terminal punctuation.', 'any text', (s) => `Sentences: ${(s.match(/[.!?]+(\s|$)/g) || []).length}`, ['count']),
  t('text-word-frequency', 'Word Frequency', 'Rank the most frequent words.', 'any text', (s) => freqReport(s.toLowerCase().match(/[a-z0-9']+/g) || [], 'Word frequency'), ['analysis']),
  t('text-char-frequency', 'Character Frequency', 'Rank the most frequent characters.', 'any text', (s) => freqReport([...s.replace(/\s/g, '')], 'Character frequency'), ['analysis']),
  t('text-reading-time', 'Reading Time', 'Estimate reading time at 220 wpm.', 'any text', (s) => {
    const w = (s.trim().match(/\S+/g) || []).length;
    const min = w / 220;
    return `${w} words ≈ ${min < 1 ? `${Math.ceil(min * 60)} seconds` : `${min.toFixed(1)} minutes`} at 220 wpm`;
  }, ['analysis']),

  // ── Extraction ───────────────────────────────────────────────────
  t('text-extract-emails', 'Extract Emails', 'Pull all email addresses out of text.', 'any text', (s) => extract(s, /[\w.+-]+@[\w-]+\.[\w.-]+/g, 'emails'), ['extract'], 'contact a@b.com or c@d.org'),
  t('text-extract-urls', 'Extract URLs', 'Pull all http/https URLs out of text.', 'any text', (s) => extract(s, /https?:\/\/[^\s"'<>]+/g, 'URLs'), ['extract']),
  t('text-extract-numbers', 'Extract Numbers', 'Pull all numbers out of text.', 'any text', (s) => extract(s, /-?\d+(\.\d+)?/g, 'numbers'), ['extract']),
  t('text-extract-hashtags', 'Extract Hashtags', 'Pull all #hashtags out of text.', 'any text', (s) => extract(s, /#[\w]+/g, 'hashtags'), ['extract']),
  t('text-extract-mentions', 'Extract @Mentions', 'Pull all @mentions out of text.', 'any text', (s) => extract(s, /@[\w.]+/g, 'mentions'), ['extract']),
  t('text-extract-ipv4', 'Extract IPv4 Addresses', 'Pull all IPv4 addresses out of text.', 'any text', (s) => extract(s, /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, 'IPv4 addresses'), ['extract', 'network']),

  // ── Transforms ───────────────────────────────────────────────────
  t('text-slugify', 'Slugify', 'URL-safe slug: lowercase, hyphens, no accents.', 'any text', (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''), ['url'], 'Héllo Wörld! 2025'),
  t('text-truncate-100', 'Truncate to 100 chars', 'Cut text to 100 characters with ellipsis.', 'any text', (s) => (s.length <= 100 ? s : s.slice(0, 100).trimEnd() + '…'), ['transform']),
  t('text-initials', 'Initials', 'First letter of each word, uppercased.', 'a name or phrase', (s) => s.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() || '').join(''), ['transform'], 'ada lovelace king'),
  t('text-acronym', 'Acronym Builder', 'Build a dotted acronym from a phrase.', 'a phrase', (s) => s.trim().split(/\s+/).map((w) => w[0]?.toUpperCase() || '').join('.') + '.', ['transform']),
  t('text-nato', 'NATO Phonetic', 'Spell text with the NATO phonetic alphabet.', 'letters and digits', (s) => [...s.toLowerCase()].map((c) => NATO[c] || (c === ' ' ? '/' : c)).filter(Boolean).join(' '), ['spell'], 'sos'),
  t('text-leetspeak', 'Leetspeak', 'Convert text to 1337 speak.', 'any text', (s) => [...s.toLowerCase()].map((c) => LEET[c] || c).join(''), ['fun'], 'elite hacker'),
  t('text-upside-down', 'Upside Down Text', 'Flip text upside down with Unicode.', 'any text', (s) => [...s.toLowerCase()].map((c) => UPSIDE[c] || c).reverse().join(''), ['fun'], 'hello world'),
  t('text-small-caps', 'Small Caps', 'Convert to Unicode small capitals.', 'any text', (s) => [...s.toLowerCase()].map((c) => SMALLCAPS[c] || c).join(''), ['fun']),
  t('text-fullwidth', 'Ｆｕｌｌｗｉｄｔｈ', 'Convert ASCII to fullwidth (vaporwave) characters.', 'any text', (s) => [...s].map((c) => {
    const code = c.charCodeAt(0);
    if (code === 32) return '　';
    return code >= 33 && code <= 126 ? String.fromCharCode(code + 0xfee0) : c;
  }).join(''), ['fun'], 'aesthetic'),
  t('text-clap', 'Clap 👏 Text', 'Insert a clap emoji between every word.', 'any text', (s) => s.trim().split(/\s+/).join(' 👏 '), ['fun']),
  t('text-mock', 'Mocking SpongeBob Case', 'rAnDoMiZe LeTtEr CaSe.', 'any text', (s) => [...s].map((c) => (Math.random() < 0.5 ? c.toLowerCase() : c.toUpperCase())).join(''), ['fun']),
  t('text-quote-lines', 'Quote Lines (>)', 'Prefix each line with "> " (email/markdown quote).', 'multi-line text', (s) => lines(s).map((l) => `> ${l}`).join('\n'), ['transform']),
  t('text-bullet-lines', 'Bullet Lines (•)', 'Prefix each line with a bullet.', 'multi-line text', (s) => lines(s).map((l) => `• ${l}`).join('\n'), ['transform']),
  t('text-json-escape', 'JSON-Escape String', 'Escape text for embedding in a JSON string.', 'any text', (s) => JSON.stringify(s), ['dev']),
  t('text-repeat-3', 'Repeat ×3', 'Repeat the text three times on separate lines.', 'any text', (s) => Array(3).fill(s).join('\n'), ['transform']),
  t('text-first-lines-10', 'First 10 Lines', 'Keep only the first 10 lines (head).', 'multi-line text', (s) => lines(s).slice(0, 10).join('\n'), ['lines']),
  t('text-last-lines-10', 'Last 10 Lines', 'Keep only the last 10 lines (tail).', 'multi-line text', (s) => lines(s).slice(-10).join('\n'), ['lines']),
  t('text-swap-quotes', 'Swap Quote Style', "Swap double quotes to single and vice versa.", 'any text', (s) => [...s].map((c) => (c === '"' ? "'" : c === "'" ? '"' : c)).join(''), ['transform']),
  t('text-diff-lines', 'Line Set Difference', 'Lines in block A not present in block B. Separate blocks with a line containing only ---', 'lines A\\n---\\nlines B', (s) => {
    const [a, b] = s.split(/\n---\n/);
    if (b === undefined) return 'Separate the two blocks with a line containing only ---';
    const bSet = new Set(lines(b).map((l) => l.trim()));
    const out = lines(a).filter((l) => !bSet.has(l.trim()));
    return out.length ? out.join('\n') : '(no unique lines in A)';
  }, ['compare', 'lines']),
  t('text-common-lines', 'Common Lines', 'Lines present in both block A and block B. Separate blocks with ---', 'lines A\\n---\\nlines B', (s) => {
    const [a, b] = s.split(/\n---\n/);
    if (b === undefined) return 'Separate the two blocks with a line containing only ---';
    const bSet = new Set(lines(b).map((l) => l.trim()));
    const out = [...new Set(lines(a).filter((l) => bSet.has(l.trim())))];
    return out.length ? out.join('\n') : '(no common lines)';
  }, ['compare', 'lines']),
];
