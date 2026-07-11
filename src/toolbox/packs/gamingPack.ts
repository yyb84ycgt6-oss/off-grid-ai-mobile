/**
 * Games & Dice pack — tabletop dice math, RNG rituals, party tools.
 * Random draws use Math.random (games, not security); crypto stays in the crypto pack.
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
  id, name, description, category: 'gaming', tags: ['gaming', ...tags], inputHint, example, seedSize: '1 KB', access: 'free', run,
});

const roll = (sides: number): number => Math.floor(Math.random() * sides) + 1;
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const lines = (s: string): string[] => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

const SUITS = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const gamingPack: ToolboxTool[] = [
  t('gm-dice', 'Dice Roller (XdY+Z)', 'Roll dice notation: 3d6, 1d20+5, 4d8-2. Multiple rolls comma-separated.', 'dice notation', (s) => {
    const specs = s.split(',').map((x) => x.trim()).filter(Boolean);
    if (!specs.length) return 'Enter dice notation, e.g. 3d6 or 1d20+5';
    return specs.map((spec) => {
      const m = spec.toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/);
      if (!m) return `${spec}: invalid (use XdY+Z)`;
      const n = Math.min(parseInt(m[1]) || 1, 100), sides = parseInt(m[2]), mod = parseInt(m[3] ?? '0');
      if (sides < 2 || sides > 1000) return `${spec}: sides must be 2–1000`;
      const rolls = Array.from({ length: n }, () => roll(sides));
      const total = rolls.reduce((a, b) => a + b, 0) + mod;
      return `${spec}: [${rolls.join(', ')}]${mod ? ` ${mod > 0 ? '+' : ''}${mod}` : ''} = ${total}`;
    }).join('\n');
  }, ['dice', 'dnd'], '3d6, 1d20+5'),
  t('gm-advantage', 'D20 Advantage/Disadvantage', 'Roll 2d20 and keep high (adv) or low (dis). Format: adv|dis[::modifier]', 'adv|dis[::mod]', (s) => {
    const p = s.split('::'); const mode = p[0].trim().toLowerCase(); const mod = parseInt(p[1] ?? '0') || 0;
    if (!/^(adv|dis)/.test(mode)) return 'Format: adv or dis, optionally ::modifier (adv::3)';
    const [a, b] = [roll(20), roll(20)];
    const kept = mode.startsWith('adv') ? Math.max(a, b) : Math.min(a, b);
    return `Rolled ${a} and ${b} → kept ${kept}${mod ? ` ${mod > 0 ? '+' : ''}${mod} = ${kept + mod}` : ''}${kept === 20 ? ' — NATURAL 20' : kept === 1 ? ' — natural 1' : ''}`;
  }, ['dnd', 'd20'], 'adv::3'),
  t('gm-coin', 'Coin Flip', 'Flip one or more coins. Input: count (default 1)', 'count', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 1, 1), 100);
    const flips = Array.from({ length: n }, () => (Math.random() < 0.5 ? 'Heads' : 'Tails'));
    const h = flips.filter((f) => f === 'Heads').length;
    return n === 1 ? flips[0] : `${flips.join(', ')}\n${h} heads / ${n - h} tails`;
  }, ['coin'], '3'),
  t('gm-8ball', 'Oracle Ball', 'Ask a yes/no question, receive fate.', 'your question', () => {
    const answers = ['It is certain.', 'Without a doubt.', 'Yes, definitely.', 'Most likely.', 'Signs point to yes.', 'Ask again later.', 'Cannot predict now.', 'Better not tell you now.', "Don't count on it.", 'My reply is no.', 'Very doubtful.', 'Outlook not so good.'];
    return answers[Math.floor(Math.random() * answers.length)];
  }, ['oracle', 'fortune'], 'Will the build pass?'),
  t('gm-rps', 'Rock Paper Scissors', 'Play against the machine. Input: rock, paper, or scissors', 'rock|paper|scissors', (s) => {
    const you = s.trim().toLowerCase();
    if (!['rock', 'paper', 'scissors'].includes(you)) return 'Play rock, paper, or scissors.';
    const ai = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
    const verdict = you === ai ? 'Draw.' : (you === 'rock' && ai === 'scissors') || (you === 'paper' && ai === 'rock') || (you === 'scissors' && ai === 'paper') ? 'You win.' : 'Machine wins.';
    return `You: ${you} · Machine: ${ai} → ${verdict}`;
  }, ['rps'], 'rock'),
  t('gm-card', 'Draw Cards', 'Draw N cards from a shuffled 52-card deck. Input: count', 'count', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 1, 1), 52);
    const deck = SUITS.flatMap((suit) => RANKS.map((rank) => `${rank} of ${suit}`));
    return shuffle(deck).slice(0, n).join('\n');
  }, ['cards', 'deck'], '5'),
  t('gm-ability-scores', 'D&D Ability Scores', 'Six scores, 4d6 drop lowest each. Input ignored.', 'press run', () => {
    const stats = Array.from({ length: 6 }, () => {
      const rolls = Array.from({ length: 4 }, () => roll(6)).sort((a, b) => b - a);
      return { rolls, total: rolls[0] + rolls[1] + rolls[2] };
    });
    const names = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    return stats.map((s2, i) => `${names[i]}: ${String(s2.total).padStart(2)} (rolled ${s2.rolls.join(',')} — dropped ${s2.rolls[3]})`).join('\n') +
      `\nTotal: ${stats.reduce((a, b) => a + b.total, 0)}`;
  }, ['dnd', 'character']),
  t('gm-initiative', 'Initiative Tracker', 'Roll d20+mod for each combatant. Format: name:mod per line', 'name:mod lines', (s) => {
    const rows = lines(s).map((l) => { const m = l.match(/^(.+?)[:\s]+(-?\d+)$/); return m ? { name: m[1].trim(), mod: +m[2] } : { name: l, mod: 0 }; });
    if (!rows.length) return 'One combatant per line: Goblin:2';
    return rows
      .map((r2) => ({ ...r2, total: roll(20) + r2.mod }))
      .sort((a, b) => b.total - a.total)
      .map((r2, i) => `${i + 1}. ${r2.name} — ${r2.total} (${r2.mod >= 0 ? '+' : ''}${r2.mod})`)
      .join('\n');
  }, ['dnd', 'initiative'], 'Fighter:3\nGoblin:2\nWizard:1'),
  t('gm-hit-chance', 'D20 Hit Chance', 'Probability d20+mod meets a target AC/DC. Format: mod::target', 'mod::AC', (s) => {
    const p = s.split('::').map(Number); if (p.length < 2 || p.some(isNaN)) return 'Format: 5::15 (attack +5 vs AC 15)';
    const needed = p[1] - p[0];
    const chance = needed <= 1 ? 95 : needed > 20 ? 5 : (21 - needed) * 5;
    return `Need ${Math.max(2, Math.min(needed, 20))}+ on the die → ${chance}% hit chance (nat 1 always misses, nat 20 always hits)`;
  }, ['dnd', 'probability'], '5::15'),
  t('gm-xp-level', 'D&D 5e XP → Level', 'Character level for an XP total. Input: XP', 'XP', (s) => {
    const xp = parseInt(s.replace(/[,\s]/g, '')); if (isNaN(xp) || xp < 0) return 'Enter total XP.';
    const thresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
    let lvl = 1;
    thresholds.forEach((t2, i) => { if (xp >= t2) lvl = i + 1; });
    const next = thresholds[lvl] !== undefined ? `${(thresholds[lvl] - xp).toLocaleString()} XP to level ${lvl + 1}` : 'max level';
    return `Level ${lvl} (${xp.toLocaleString()} XP) · ${next}`;
  }, ['dnd', 'xp'], '7200'),
  t('gm-loot', 'Loot Rarity Roller', 'Random rarity with standard drop weights. Input: count', 'count', (s) => {
    const n = Math.min(Math.max(parseInt(s) || 1, 1), 20);
    const table: [string, number][] = [['Common', 60], ['Uncommon', 25], ['Rare', 10], ['Epic', 4], ['Legendary', 1]];
    const draw = () => { let r2 = Math.random() * 100; for (const [name, w] of table) { if ((r2 -= w) < 0) return name; } return 'Common'; };
    return Array.from({ length: n }, draw).join('\n');
  }, ['loot', 'rarity'], '5'),
  t('gm-lottery', 'Lottery Numbers', 'Unique picks. Format: count::max (default 6::49)', 'count::max', (s) => {
    const p = s.split('::').map(Number);
    const count = Math.min(Math.max(p[0] || 6, 1), 20); const max = Math.min(Math.max(p[1] || 49, count), 999);
    const pool = shuffle(Array.from({ length: max }, (_, i) => i + 1));
    return pool.slice(0, count).sort((a, b) => a - b).join(' – ');
  }, ['lottery'], '6::49'),
  t('gm-bingo', 'Bingo Card', 'Standard 5×5 B-I-N-G-O card with free center.', 'press run', () => {
    const col = (lo: number) => shuffle(Array.from({ length: 15 }, (_, i) => lo + i)).slice(0, 5);
    const cols = [col(1), col(16), col(31), col(46), col(61)];
    cols[2][2] = 0;
    const head = ' B   I   N   G   O';
    const rows = Array.from({ length: 5 }, (_, r2) => cols.map((c) => (c[r2] === 0 ? ' * ' : String(c[r2]).padStart(2).padEnd(3))).join(' '));
    return [head, ...rows].join('\n') + '\n(* = free space)';
  }, ['bingo']),
  t('gm-spinner', 'Wheel Spinner', 'Spin a wheel of your options. Input: options comma-separated', 'a, b, c', (s) => {
    const opts = s.split(',').map((x) => x.trim()).filter(Boolean);
    if (opts.length < 2) return 'Give at least two options, comma-separated.';
    return `The wheel lands on: ${opts[Math.floor(Math.random() * opts.length)]}`;
  }, ['spinner', 'decide'], 'pizza, sushi, tacos, curry'),
];
