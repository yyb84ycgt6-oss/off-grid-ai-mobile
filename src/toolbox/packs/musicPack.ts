/**
 * Music & Audio pack — pitch math, BPM timing, scales, chords, MIDI.
 * Equal temperament, A4 = 440 Hz. Fully offline.
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
  id, name, description, category: 'music', tags: ['music', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Parse "C#4", "Bb3", "A" (default octave 4) → MIDI number, or NaN. */
const toMidi = (s: string): number => {
  const m = s.trim().match(/^([A-Ga-g])([#b]?)(-?\d+)?$/);
  if (!m) return NaN;
  let semitone = NOTES.indexOf(m[1].toUpperCase());
  if (semitone < 0) return NaN;
  if (m[2] === '#') semitone = (semitone + 1) % 12;
  if (m[2] === 'b') semitone = (semitone + 11) % 12;
  const oct = m[3] !== undefined ? parseInt(m[3]) : 4;
  return (oct + 1) * 12 + semitone;
};

const midiToName = (midi: number): string => `${NOTES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
const midiToFreq = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
const bad = (hint: string) => `Format: ${hint}`;

const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11],
  'pentatonic major': [0, 2, 4, 7, 9],
  'pentatonic minor': [0, 3, 5, 7, 10],
  blues: [0, 3, 5, 6, 7, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

const CHORDS: Record<string, [string, number[]]> = {
  '': ['major', [0, 4, 7]], maj: ['major', [0, 4, 7]], m: ['minor', [0, 3, 7]], min: ['minor', [0, 3, 7]],
  '7': ['dominant 7th', [0, 4, 7, 10]], maj7: ['major 7th', [0, 4, 7, 11]], m7: ['minor 7th', [0, 3, 7, 10]],
  dim: ['diminished', [0, 3, 6]], aug: ['augmented', [0, 4, 8]], sus2: ['sus2', [0, 2, 7]], sus4: ['sus4', [0, 5, 7]],
  '6': ['major 6th', [0, 4, 7, 9]], m6: ['minor 6th', [0, 3, 7, 9]], '9': ['dominant 9th', [0, 4, 7, 10, 14]],
  add9: ['add9', [0, 4, 7, 14]], dim7: ['diminished 7th', [0, 3, 6, 9]], m7b5: ['half-diminished', [0, 3, 6, 10]],
};

const INTERVALS = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th', 'octave'];

export const musicPack: ToolboxTool[] = [
  t('mu-note-freq', 'Note → Frequency', 'Pitch of a note in Hz (A4 = 440). Input: note like A4, C#3, Bb5', 'note+octave', (s) => {
    const midi = toMidi(s); if (isNaN(midi)) return bad('A4, C#3, Bb5');
    return `${midiToName(midi)} = ${midiToFreq(midi).toFixed(2)} Hz (MIDI ${midi})`;
  }, ['pitch', 'frequency'], 'A4'),
  t('mu-freq-note', 'Frequency → Nearest Note', 'Closest note to a frequency with cents offset. Input: Hz', 'Hz', (s) => {
    const hz = parseFloat(s); if (!hz || hz <= 0) return 'Enter a frequency in Hz.';
    const midi = Math.round(69 + 12 * Math.log2(hz / 440));
    const cents = Math.round(1200 * Math.log2(hz / midiToFreq(midi)));
    return `${hz} Hz ≈ ${midiToName(midi)} (${midiToFreq(midi).toFixed(2)} Hz) ${cents >= 0 ? '+' : ''}${cents} cents`;
  }, ['pitch', 'tuning'], '445'),
  t('mu-bpm-ms', 'BPM → Milliseconds', 'Beat and note durations at a tempo. Input: BPM', 'BPM', (s) => {
    const bpm = parseFloat(s); if (!bpm || bpm <= 0) return 'Enter a tempo in BPM.';
    const beat = 60000 / bpm;
    const rows: [string, number][] = [['1/1', beat * 4], ['1/2', beat * 2], ['1/4 (beat)', beat], ['1/8', beat / 2], ['1/16', beat / 4], ['1/8 dotted', beat * 0.75], ['1/8 triplet', beat / 3]];
    return `${bpm} BPM:\n` + rows.map(([n, ms]) => `${n.padEnd(12)} ${ms.toFixed(1)} ms`).join('\n');
  }, ['bpm', 'delay'], '120'),
  t('mu-ms-bpm', 'Milliseconds → BPM', 'Tempo from a beat interval (e.g. tap two hits). Input: ms', 'ms per beat', (s) => {
    const ms = parseFloat(s); if (!ms || ms <= 0) return 'Enter the interval in milliseconds.';
    return `${ms} ms/beat = ${(60000 / ms).toFixed(1)} BPM`;
  }, ['bpm'], '500'),
  t('mu-transpose', 'Transpose Note', 'Shift a note by semitones. Format: note::semitones (±)', 'note::±semitones', (s) => {
    const p = s.split('::'); const midi = toMidi(p[0]); const shift = parseInt(p[1]);
    if (isNaN(midi) || isNaN(shift)) return bad('C4::5 or A3::-2');
    return `${midiToName(midi)} ${shift >= 0 ? '+' : ''}${shift} semitones → ${midiToName(midi + shift)} (${midiToFreq(midi + shift).toFixed(2)} Hz)`;
  }, ['transpose'], 'C4::5'),
  t('mu-interval', 'Interval Between Notes', 'Name the interval between two notes. Format: note::note', 'note::note', (s) => {
    const p = s.split('::'); const a = toMidi(p[0]), b = toMidi(p[1] ?? '');
    if (isNaN(a) || isNaN(b)) return bad('C4::G4');
    const d = Math.abs(b - a);
    const name = d <= 12 ? INTERVALS[d] : `${Math.floor(d / 12)} octave(s) + ${INTERVALS[d % 12]}`;
    return `${midiToName(a)} → ${midiToName(b)}: ${name} (${d} semitones)`;
  }, ['interval'], 'C4::G4'),
  t('mu-scale', 'Scale Notes', 'Notes of a scale. Format: root::scale (major, minor, blues, dorian, pentatonic minor…)', 'root::scale', (s) => {
    const p = s.split('::'); const root = toMidi((p[0] ?? '') + (/\d/.test(p[0] ?? '') ? '' : '4'));
    const scaleName = (p[1] ?? 'major').trim().toLowerCase();
    const scale = SCALES[scaleName];
    if (isNaN(root)) return bad('C::major or A::pentatonic minor');
    if (!scale) return `Unknown scale. Available: ${Object.keys(SCALES).join(', ')}`;
    return `${midiToName(root).replace(/\d+$/, '')} ${scaleName}: ${scale.map((i) => NOTES[(root + i) % 12]).join(' – ')}`;
  }, ['scale'], 'C::major'),
  t('mu-chord', 'Chord Notes', 'Spell a chord. Input like Cmaj7, Am, G7, Dsus4, F#m7b5', 'chord symbol', (s) => {
    const m = s.trim().match(/^([A-Ga-g][#b]?)(.*)$/); if (!m) return bad('Cmaj7, Am, G7, Dsus4');
    const root = toMidi(m[1] + '4'); const kind = CHORDS[m[2].trim()];
    if (isNaN(root)) return bad('Cmaj7, Am, G7');
    if (!kind) return `Unknown chord type "${m[2]}". Available: ${Object.keys(CHORDS).filter(Boolean).join(', ')}`;
    return `${m[1].toUpperCase()}${m[2]} (${kind[0]}): ${kind[1].map((i) => NOTES[(root + i) % 12]).join(' – ')}`;
  }, ['chord'], 'Cmaj7'),
  t('mu-midi', 'MIDI ↔ Note Name', 'Convert MIDI number to note or back. Input: number or note', 'midi or note', (s) => {
    const q = s.trim();
    if (/^\d+$/.test(q)) { const n = parseInt(q); if (n > 127) return 'MIDI range is 0–127.'; return `MIDI ${n} = ${midiToName(n)} (${midiToFreq(n).toFixed(2)} Hz)`; }
    const midi = toMidi(q); if (isNaN(midi)) return bad('60 or C4');
    return `${midiToName(midi)} = MIDI ${midi}`;
  }, ['midi'], '60'),
  t('mu-tempo-term', 'Tempo Term', 'Classical tempo marking for a BPM. Input: BPM', 'BPM', (s) => {
    const bpm = parseFloat(s); if (!bpm) return 'Enter BPM.';
    const terms: [number, string][] = [[40, 'Grave'], [45, 'Largo'], [55, 'Larghetto'], [65, 'Adagio'], [72, 'Andante'], [80, 'Andantino'], [95, 'Moderato'], [110, 'Allegretto'], [130, 'Allegro'], [160, 'Vivace'], [180, 'Presto'], [999, 'Prestissimo']];
    const term = terms.find(([max]) => bpm <= max)?.[1] ?? 'Prestissimo';
    return `${bpm} BPM ≈ ${term}`;
  }, ['tempo'], '120'),
  t('mu-song-length', 'Bars → Duration', 'Song section length in time. Format: bars::BPM[::beats per bar]', 'bars::bpm[::sig]', (s) => {
    const p = s.split('::').map(Number); if (!p[0] || !p[1]) return bad('32::120 or 16::90::3');
    const [bars, bpm, beats] = [p[0], p[1], p[2] || 4];
    const sec = (bars * beats * 60) / bpm;
    return `${bars} bars of ${beats}/4 at ${bpm} BPM = ${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')} (${sec.toFixed(1)} s)`;
  }, ['bars', 'arrangement'], '32::120'),
  t('mu-sample-length', 'Samples ↔ Time', 'Audio samples to duration. Format: samples::rate (44100/48000)', 'samples::rate', (s) => {
    const p = s.split('::').map(Number); if (!p[0] || !p[1]) return bad('88200::44100');
    return `${p[0].toLocaleString()} samples @ ${p[1]} Hz = ${((p[0] / p[1]) * 1000).toFixed(2)} ms (${(p[0] / p[1]).toFixed(4)} s)`;
  }, ['samples', 'audio'], '88200::44100'),
  t('mu-cents', 'Cents Between Frequencies', 'Pitch offset between two frequencies. Format: Hz::Hz', 'f1::f2', (s) => {
    const p = s.split('::').map(Number); if (!p[0] || !p[1]) return bad('440::445');
    const cents = 1200 * Math.log2(p[1] / p[0]);
    return `${p[0]} → ${p[1]} Hz = ${cents >= 0 ? '+' : ''}${cents.toFixed(1)} cents (${Math.abs(cents) < 5 ? 'inaudible to most' : Math.abs(cents) < 20 ? 'subtle' : 'clearly audible'})`;
  }, ['tuning', 'cents'], '440::445'),
  t('mu-audio-filesize', 'Audio File Size', 'Uncompressed PCM size. Format: minutes::rate::bits::channels', 'min::rate::bits::ch', (s) => {
    const p = s.split('::').map(Number); if (!p[0]) return bad('3::44100::16::2');
    const [min, rate, bits, ch] = [p[0], p[1] || 44100, p[2] || 16, p[3] || 2];
    const bytes = min * 60 * rate * (bits / 8) * ch;
    return `${min} min @ ${rate} Hz/${bits}-bit/${ch}ch = ${(bytes / 1048576).toFixed(1)} MB WAV\nMP3 320kbps ≈ ${((min * 60 * 320000) / 8 / 1048576).toFixed(1)} MB`;
  }, ['audio', 'filesize'], '3::44100::16::2'),
];
