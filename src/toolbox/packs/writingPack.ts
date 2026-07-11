/**
 * Writing Studio pack — readability, rhythm, and revision tools for prose.
 * Heuristic English analysis (syllables approximated by vowel groups).
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
  id, name, description, category: 'writing', tags: ['writing', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const words = (s: string): string[] => s.toLowerCase().match(/[a-z']+/g) ?? [];
const sentences = (s: string): string[] => s.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean);

/** Approximate syllables: vowel groups, minus common silent-e, min 1. */
const syllables = (word: string): number => {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  let groups = (w.match(/[aeiouy]+/g) ?? []).length;
  if (w.endsWith('e') && !w.endsWith('le') && groups > 1) groups--;
  return Math.max(1, groups);
};

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export const writingPack: ToolboxTool[] = [
  t('wr-readability', 'Readability Score', 'Flesch Reading Ease + Flesch-Kincaid grade level.', 'paragraph of text', (s) => {
    const w = words(s), sen = sentences(s);
    if (w.length < 3 || !sen.length) return 'Paste at least a sentence of text.';
    const syl = w.reduce((a, b) => a + syllables(b), 0);
    const ease = 206.835 - 1.015 * (w.length / sen.length) - 84.6 * (syl / w.length);
    const grade = 0.39 * (w.length / sen.length) + 11.8 * (syl / w.length) - 15.59;
    const band = ease >= 90 ? 'very easy' : ease >= 70 ? 'easy' : ease >= 60 ? 'plain English' : ease >= 50 ? 'fairly difficult' : ease >= 30 ? 'difficult' : 'very difficult';
    return `Flesch Reading Ease: ${ease.toFixed(1)} (${band})\nGrade level: ${Math.max(0, grade).toFixed(1)}\n${w.length} words · ${sen.length} sentences · ${syl} syllables`;
  }, ['readability', 'flesch'], 'The quick brown fox jumps over the lazy dog. It was a bright cold day in April.'),
  t('wr-syllables', 'Syllable Counter', 'Estimated syllables per word and total.', 'text', (s) => {
    const w = words(s); if (!w.length) return 'Paste some text.';
    const total = w.reduce((a, b) => a + syllables(b), 0);
    const detail = w.slice(0, 30).map((x) => `${x}(${syllables(x)})`).join(' ');
    return `Total syllables: ${total} across ${w.length} words\n${detail}${w.length > 30 ? ' …' : ''}`;
  }, ['syllables'], 'incomprehensible bureaucracy'),
  t('wr-reading-time', 'Reading Time', 'Silent reading + speaking time. Input: text[::wpm]', 'text', (s) => {
    const w = words(s).length; if (!w) return 'Paste text.';
    const read = w / 230, speak = w / 140;
    const fmt = (min: number) => min < 1 ? `${Math.ceil(min * 60)} s` : `${Math.floor(min)} min ${Math.round((min % 1) * 60)} s`;
    return `${w} words\nSilent reading (~230 wpm): ${fmt(read)}\nSpoken aloud (~140 wpm): ${fmt(speak)}`;
  }, ['reading', 'wpm'], 'Paste your article here to time it.'),
  t('wr-sentence-report', 'Sentence Length Report', 'Average/longest sentence, flags 30+ word runs.', 'text', (s) => {
    const sen = sentences(s); if (!sen.length) return 'Paste text with sentences.';
    const counts = sen.map((x) => words(x).length);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const long = sen.filter((_, i) => counts[i] >= 30).length;
    return `${sen.length} sentences · avg ${avg.toFixed(1)} words\nShortest: ${Math.min(...counts)} · Longest: ${Math.max(...counts)}\n${long ? `${long} sentence(s) run 30+ words — consider splitting.` : 'No overlong sentences.'}`;
  }, ['sentences'], 'Short one. Then a somewhat longer sentence follows the first.'),
  t('wr-word-freq', 'Word Frequency', 'Top repeated words (skips 40 common stopwords).', 'text', (s) => {
    const stop = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'is', 'are', 'was', 'were', 'be', 'been', 'it', 'its', 'this', 'that', 'with', 'as', 'for', 'by', 'from', 'not', 'no', 'so', 'if', 'then', 'than', 'too', 'very', 'can', 'will', 'just', 'i', 'you', 'we']);
    const freq = new Map<string, number>();
    words(s).filter((w) => !stop.has(w) && w.length > 2).forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1));
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
    return top.length ? top.map(([w, c]) => `${String(c).padStart(3)} × ${w}`).join('\n') : 'No repeated content words.';
  }, ['frequency'], 'the cat sat on the cat mat with the cat'),
  t('wr-palindrome', 'Palindrome Check', 'Ignores case, spaces, punctuation.', 'text', (s) => {
    const n = norm(s); if (!n) return 'Enter text to check.';
    const rev = [...n].reverse().join('');
    return n === rev ? `PALINDROME ✓ ("${n}")` : `Not a palindrome ("${n}" vs "${rev}")`;
  }, ['palindrome'], 'A man, a plan, a canal: Panama'),
  t('wr-anagram', 'Anagram Check', 'Are two phrases anagrams? Format: one::two', 'text::text', (s) => {
    const p = s.split('::'); if (p.length < 2) return 'Format: listen::silent';
    const sig = (x: string) => [...norm(x)].sort().join('');
    return sig(p[0]) === sig(p[1]) && norm(p[0]).length > 0
      ? `ANAGRAMS ✓ (letters: ${sig(p[0])})`
      : 'Not anagrams — letter counts differ.';
  }, ['anagram'], 'listen::silent'),
  t('wr-acronym', 'Acronym Builder', 'First letters of each word, uppercased.', 'phrase', (s) => {
    const w = s.trim().split(/\s+/).filter(Boolean);
    if (!w.length) return 'Enter a phrase.';
    return w.map((x) => x[0].toUpperCase()).join('');
  }, ['acronym'], 'portable network graphics'),
  t('wr-alliteration', 'Alliteration Finder', 'Groups consecutive words sharing a starting letter.', 'text', (s) => {
    const w = s.toLowerCase().match(/[a-z]+/g) ?? [];
    if (w.length < 2) return 'Paste a few words.';
    const runs: string[] = [];
    let run = [w[0]];
    for (let i = 1; i <= w.length; i++) {
      if (i < w.length && w[i][0] === run[0][0]) run.push(w[i]);
      else { if (run.length >= 2) runs.push(run.join(' ')); run = [w[i] ?? '']; }
    }
    return runs.length ? `Alliterative runs:\n${runs.map((r) => `• ${r}`).join('\n')}` : 'No alliterative runs found.';
  }, ['alliteration'], 'Peter Piper picked a peck of pickled peppers'),
  t('wr-passive', 'Passive Voice Detector', 'Flags be-verb + past participle patterns (heuristic).', 'text', (s) => {
    if (!s.trim()) return 'Paste text.';
    const matches = s.match(/\b(?:is|are|was|were|be|been|being)\s+(\w+(?:ed|en|wn|ne))\b/gi) ?? [];
    return matches.length
      ? `${matches.length} likely passive construction(s):\n${matches.slice(0, 10).map((m) => `• "${m}"`).join('\n')}`
      : 'No obvious passive voice.';
  }, ['passive', 'style'], 'The ball was thrown by the boy. Mistakes were made.'),
  t('wr-cliche', 'Cliché Detector', 'Flags 40 tired phrases worth cutting.', 'text', (s) => {
    const cliches = ['at the end of the day', 'think outside the box', 'low-hanging fruit', 'move the needle', 'paradigm shift', 'synergy', 'best of both worlds', 'tip of the iceberg', 'in this day and age', 'when all is said and done', 'the fact of the matter', 'last but not least', 'easier said than done', 'time will tell', 'avoid like the plague', 'a level playing field', 'circle back', 'touch base', 'game changer', 'push the envelope', 'take it to the next level', 'win-win', 'no-brainer', 'boil the ocean', 'drink the kool-aid', 'it is what it is', 'at this point in time', 'few and far between', 'in the nick of time', 'leave no stone unturned'];
    const low = s.toLowerCase();
    const found = cliches.filter((c) => low.includes(c));
    return found.length ? `Found ${found.length} cliché(s):\n${found.map((c) => `• ${c}`).join('\n')}` : 'Clean — no listed clichés.';
  }, ['cliche', 'style'], 'At the end of the day it is what it is.'),
  t('wr-title-case', 'Title Case (AP-style)', 'Capitalizes, keeping minor words lowered mid-title.', 'title text', (s) => {
    if (!s.trim()) return 'Enter a title.';
    const minor = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'at', 'by', 'in', 'of', 'on', 'to', 'up', 'off', 'out', 'via', 'as', 'per']);
    const parts = s.trim().toLowerCase().split(/\s+/);
    return parts.map((w, i) =>
      i === 0 || i === parts.length - 1 || !minor.has(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w
    ).join(' ');
  }, ['title', 'capitalize'], 'the war of the worlds'),
  t('wr-haiku', 'Haiku Checker', 'Does the 3-line poem scan 5-7-5? (syllables estimated)', '3 lines', (s) => {
    const ls = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (ls.length !== 3) return 'A haiku needs exactly 3 lines.';
    const counts = ls.map((l) => words(l).reduce((a, b) => a + syllables(b), 0));
    const target = [5, 7, 5];
    const report = counts.map((c, i) => `Line ${i + 1}: ${c} syllable(s) ${c === target[i] ? '✓' : `(want ${target[i]})`}`).join('\n');
    return `${report}\n${counts.every((c, i) => c === target[i]) ? 'Valid 5-7-5 haiku ✓' : 'Not quite 5-7-5 (estimator is approximate).'}`;
  }, ['haiku', 'poetry'], 'An old silent pond\nA frog jumps into the pond\nSplash! Silence again'),
  t('wr-pangram', 'Pangram Check', 'Does the text use every letter A–Z?', 'text', (s) => {
    const present = new Set(s.toLowerCase().match(/[a-z]/g) ?? []);
    const missing = [...'abcdefghijklmnopqrstuvwxyz'].filter((c) => !present.has(c));
    return missing.length ? `Not a pangram — missing: ${missing.join(', ')}` : 'PANGRAM ✓ — all 26 letters present.';
  }, ['pangram'], 'The quick brown fox jumps over the lazy dog'),
  t('wr-lipogram', 'Lipogram Check', 'Verify text avoids a letter. Format: letter::text', 'letter::text', (s) => {
    const p = s.split('::'); if (p.length < 2 || p[0].trim().length !== 1) return 'Format: e::your text here';
    const letter = p[0].trim().toLowerCase();
    const count = (p[1].toLowerCase().match(new RegExp(letter, 'g')) ?? []).length;
    return count === 0 ? `LIPOGRAM ✓ — no "${letter}" anywhere.` : `Contains "${letter}" ${count} time(s).`;
  }, ['lipogram'], 'e::A quick brown fox jumps'),
  t('wr-hedge-words', 'Hedge Word Detector', 'Flags weakening qualifiers (very, quite, rather…).', 'text', (s) => {
    if (!s.trim()) return 'Paste text.';
    const hedges = ['very', 'quite', 'rather', 'really', 'somewhat', 'fairly', 'pretty', 'just', 'perhaps', 'maybe', 'possibly', 'probably', 'basically', 'actually', 'literally', 'arguably', 'sort of', 'kind of', 'a bit', 'a little'];
    const low = ` ${s.toLowerCase()} `;
    const found = hedges.map((h) => ({ h, n: (low.match(new RegExp(`\\b${h.replace(' ', '\\s+')}\\b`, 'g')) ?? []).length })).filter((x) => x.n > 0);
    return found.length
      ? `${found.reduce((a, b) => a + b.n, 0)} hedge(s):\n${found.map((x) => `${String(x.n).padStart(3)} × ${x.h}`).join('\n')}`
      : 'No hedge words — confident prose.';
  }, ['hedges', 'style'], 'It was really quite good, sort of.'),
];
